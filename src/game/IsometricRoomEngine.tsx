import { useEffect, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import * as PIXI from 'pixi.js';
import { AvatarRenderer } from './AvatarRenderer';
import { renderBorders } from './BorderRenderer';
import { CameraController } from './CameraController';
import { renderFloor } from './FloorRenderer';
import { isoDepth, isoToScreen, type IsoPoint, screenToIso, TILE_HEIGHT, TILE_WIDTH } from './isometric';
import { RoomEngineCore } from './openHotel/RoomEngineCore';
import type { RoomUserFrame } from './openHotel/RoomUser';
import type { RoomUser } from './openHotel/RoomUser';
import { RoomGeometry } from './RoomGeometry';
import type { PlayerSpeech, RoomAvatarDefinition, RoomDefinition, RoomObjectDefinition, RoomSelection } from './roomEngine';
import { worldAssets } from './worldManifest';
import { DevCatalogInspector } from './DevCatalogInspector';

export interface RoomEditorController {
  enabled: boolean;
  selectedObjectId: string | null;
  onSelectObject: (objectId: string) => void;
  onMoveObject: (objectId: string, position: IsoPoint) => void;
}

interface Props {
  room: RoomDefinition;
  onInteract: (message: string) => void;
  onEnterRoom?: (roomId: string) => void;
  onOpenProfile?: (username: string) => void;
  onPresenceUpdate?: (count: number) => void;
  playerSpeech?: PlayerSpeech | null;
  editor?: RoomEditorController;
}

interface Actor {
  id: string;
  node: PIXI.Container;
  visual: AvatarRenderer;
  shadow: PIXI.Sprite;
  user: RoomUser;
  patrol: IsoPoint[];
  waypointIndex: number;
  nextMoveAt: number;
  stepTravel: number;
  bubble?: PIXI.Container;
  bubbleExpiresAt: number;
  ambientSpeech: string[];
  speechIndex: number;
  nextSpeechAt: number;
  pose: 'stand' | 'sit';
  depthBias: number;
  nameplate: PIXI.Container;
  emphasisUntil: number;
  seatId?: string;
  seatVisualOffset: number;
  standingDepthBias: number;
}

interface AnimatedObject {
  node: PIXI.Container;
  sprite: PIXI.Sprite;
  baseY: number;
  mode: 'glow' | 'float' | 'sway';
  offset: number;
  baseRotation: number;
}

interface Footstep { graphic: PIXI.Graphics; life: number }
interface AmbientParticle { graphic: PIXI.Graphics; baseY: number; phase: number }
interface SceneRuntime {
  say: (text: string) => void;
  execute: (selection: RoomSelection) => void;
  zoomBy: (amount: number) => void;
  recenter: () => void;
  selectEditorObject: (objectId: string | null) => void;
}

const snapToTile = (point: IsoPoint): IsoPoint => ({ x: Math.round(point.x * 2) / 2, y: Math.round(point.y * 2) / 2 });

export function IsometricRoomEngine({ room, onInteract, onEnterRoom, onOpenProfile, onPresenceUpdate, playerSpeech, editor }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<SceneRuntime | null>(null);
  const editorRef = useRef(editor);
  const [selection, setSelection] = useState<RoomSelection | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  editorRef.current = editor;

  const runAction = () => {
    if (!selection) return;
    if (selection.action === 'view-profile' && selection.targetId) {
      onOpenProfile?.(selection.targetId);
    } else {
      runtime.current?.execute(selection);
    }
  };

  useEffect(() => {
    if (playerSpeech?.text) runtime.current?.say(playerSpeech.text);
  }, [playerSpeech]);

  useEffect(() => {
    runtime.current?.selectEditorObject(editor?.enabled ? editor.selectedObjectId : null);
  }, [editor?.enabled, editor?.selectedObjectId]);

  useEffect(() => {
    const hostElement = host.current;
    if (!hostElement) return;
    setLoadError(false);
    const app = new PIXI.Application({
      resizeTo: hostElement,
      backgroundColor: 0x17343d,
      antialias: true,
      resolution: Math.min(devicePixelRatio, 2),
      autoDensity: true,
    });
    hostElement.appendChild(app.view as HTMLCanvasElement);
    const atmosphere = new PIXI.Graphics();
    const scene = new PIXI.Container();
    scene.sortableChildren = true;
    app.stage.addChild(atmosphere, scene);
    const renderAtmosphere = () => {
      const { width, height } = app.screen;
      atmosphere.clear();
      atmosphere.beginFill(0x172f35);
      atmosphere.drawRect(0, 0, width, height);
      atmosphere.endFill();
      atmosphere.beginFill(0x594f57, 0.42);
      atmosphere.drawEllipse(-width * 0.08, height * 0.44, width * 0.56, height * 0.78);
      atmosphere.drawEllipse(width * 1.04, height * 0.58, width * 0.54, height * 0.86);
      atmosphere.endFill();
      atmosphere.beginFill(0x9b674f, 0.18);
      atmosphere.drawEllipse(width * 0.12, height * 0.96, width * 0.5, height * 0.27);
      atmosphere.drawEllipse(width * 0.82, height * 0.06, width * 0.42, height * 0.2);
      atmosphere.endFill();
      atmosphere.beginFill(0xf2d995, 0.045);
      for (let index = 0; index < 18; index += 1) {
        atmosphere.drawCircle((index * 173) % Math.max(width, 1), (index * 97) % Math.max(height, 1), 2 + (index % 3));
      }
      atmosphere.endFill();
    };
    renderAtmosphere();
    const keys = new Set<string>();
    const footsteps: Footstep[] = [];
    const ambientParticles: AmbientParticle[] = [];
    const fountainBurstParticles: { graphic: PIXI.Graphics; velocityX: number; velocityY: number; life: number }[] = [];
    const camera = new CameraController();
    const geometry = new RoomGeometry(room.geometry);
    const collisionObjects = [...room.objects, ...(room.contextObjects ?? []).filter((object) => object.collision)];
    const seatOccupants = new Map<string, string>();
    const timers = new Set<number>();
    let pendingInteraction: { selection: RoomSelection; object: RoomObjectDefinition } | null = null;
    const core = new RoomEngineCore(room.id, {
      staticBlocked: (point) => geometry.isBlocked(point, collisionObjects),
      canTraverse: (from, to) => geometry.canTraverse(from, to, collisionObjects),
      elevationAt: (point) => geometry.elevationAt(point),
    });
    let disposed = false;
    let removeWheel = () => {};
    let player: Actor;
    const schedule = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!disposed) callback();
      }, delay);
      timers.add(timer);
    };

    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
      keys.add(key);
    };
    const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const clearKeys = () => keys.clear();
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clearKeys);

    void (async () => {
      const floorAssets = Object.values(room.floor.materials).flat();
      const avatarAssets = room.avatars.flatMap((avatar) => [...avatar.appearance.layers.map((layer) => layer.asset), ...(avatar.appearance.sitAsset ? [avatar.appearance.sitAsset] : [])]);
      const wallAssets = room.geometry.walls.flatMap((wall) => wall.asset ? [wall.asset] : []);
      const urls = Array.from(new Set([...floorAssets, ...wallAssets, worldAssets.avatarShadow, ...avatarAssets, ...(room.contextObjects ?? []).map((object) => object.asset), ...room.objects.map((object) => object.asset)]));
      const textureEntries = await Promise.all(urls.map(async (url) => [url, await PIXI.Assets.load<PIXI.Texture>(url)] as const));
      if (disposed) return;
      const textures = new Map<string, PIXI.Texture>(textureEntries);
      const textureFor = (url: string) => textures.get(url) ?? PIXI.Texture.EMPTY;
      onPresenceUpdate?.(room.avatars.length);

      renderFloor(scene, room, geometry, textureFor);
      renderBorders(scene, geometry, textureFor);

      room.districts?.forEach((district) => {
        const world = geometry.worldPoint(district.anchor);
        const screen = isoToScreen(world);
        const label = new PIXI.Text(`${district.label}\n${district.detail}`, { fontFamily: 'Arial', fontSize: 8.5, fontWeight: 'bold', fill: 0xffedb0, align: 'center', letterSpacing: 1.2, lineHeight: 12 });
        label.anchor.set(.5);
        label.position.set(screen.x, screen.y);
        label.alpha = .62;
        label.zIndex = isoDepth(world) - 3;
        scene.addChild(label);
      });

      const tileCursor = new PIXI.Graphics();
      tileCursor.visible = false;
      scene.addChild(tileCursor);
      const drawTileCursor = (point: IsoPoint, occupied: boolean) => {
        const world = geometry.worldPoint(point);
        const screen = isoToScreen(world);
        tileCursor.clear();
        tileCursor.lineStyle(2, occupied ? 0xef7188 : 0xffe39a, 0.9);
        tileCursor.beginFill(occupied ? 0xef5472 : 0xffd166, occupied ? 0.08 : 0.1);
        tileCursor.drawPolygon([0, -TILE_HEIGHT / 4, TILE_WIDTH / 4, 0, 0, TILE_HEIGHT / 4, -TILE_WIDTH / 4, 0]);
        tileCursor.endFill();
        tileCursor.position.set(screen.x, screen.y);
        tileCursor.zIndex = isoDepth(world) - 2;
        tileCursor.visible = true;
      };

      const selectionRing = new PIXI.Graphics();
      selectionRing.lineStyle(2.5, 0xffe38a, 0.92);
      selectionRing.beginFill(0xffd166, 0.06);
      selectionRing.drawEllipse(0, 0, 31, 11);
      selectionRing.endFill();
      selectionRing.visible = false;
      scene.addChild(selectionRing);
      const placeSelectionRing = (point: IsoPoint) => {
        const world = geometry.worldPoint(point);
        const screen = isoToScreen(world);
        selectionRing.position.set(screen.x, screen.y + 2);
        selectionRing.zIndex = isoDepth(world) - 1;
        selectionRing.visible = true;
      };

      const insideFloor = (point: IsoPoint) => Boolean(geometry.cellAt(point));
      const blocked = (point: IsoPoint) => geometry.isBlocked(point, collisionObjects);
      const blockedForEditor = (point: IsoPoint, selectedObjectId: string) => geometry.isBlocked(
        point,
        collisionObjects.filter((object) => object.id !== selectedObjectId),
      );
      const releaseSeat = (actor: Actor) => {
        if (!actor.seatId) return;
        if (seatOccupants.get(actor.seatId) === actor.id) seatOccupants.delete(actor.seatId);
        actor.seatId = undefined;
        actor.seatVisualOffset = 0;
        actor.depthBias = actor.standingDepthBias;
      };
      const routeActor = (actor: Actor, target: IsoPoint) => {
        if (actor.user.pose === 'sit' || actor.user.pose === 'interacting') releaseSeat(actor);
        return core.routeUser(actor.id, snapToTile(target), true);
      };
      const animatedObjects: AnimatedObject[] = [];
      const interactiveObjects = new Map<string, RoomObjectDefinition>();
      const objectNodes = new Map<string, PIXI.Container>();
      const foregroundLayer = new PIXI.Container();
      foregroundLayer.sortableChildren = true;

      const editableObjectIds = new Set(room.objects.map((object) => object.id));
      const renderObjects = [...(room.contextObjects ?? []), ...room.objects];
      renderObjects.forEach((definition, index) => {
        const node = new PIXI.Container();
        const sprite = new PIXI.Sprite(textureFor(definition.asset));
        const world = geometry.worldPoint(definition.position);
        const screen = isoToScreen(world);
        sprite.anchor.set(definition.anchor?.x ?? 0.5, definition.anchor?.y ?? 1);
        sprite.width = definition.displayWidth;
        sprite.scale.y = Math.abs(sprite.scale.x);
        if (definition.direction === 2) sprite.scale.x *= -1;
        node.addChild(sprite);
        node.position.set(screen.x, screen.y);
        node.zIndex = isoDepth(geometry.worldPoint(definition.depthBase ?? definition.position)) + (definition.depthBias ?? 0);
        node.name = definition.id;
        objectNodes.set(definition.id, node);
        if (definition.interaction) interactiveObjects.set(definition.id, definition);
        if (definition.seat) {
          const foregroundTexture = new PIXI.Texture(textureFor(definition.asset).baseTexture, new PIXI.Rectangle(0, textureFor(definition.asset).baseTexture.height * 0.58, textureFor(definition.asset).baseTexture.width, textureFor(definition.asset).baseTexture.height * 0.42));
          const foregroundSprite = new PIXI.Sprite(foregroundTexture);
          foregroundSprite.anchor.set(0.5, 1);
          foregroundSprite.width = definition.displayWidth;
          foregroundSprite.scale.y = foregroundSprite.scale.x;
          if (definition.direction === 2) foregroundSprite.scale.x *= -1;
          foregroundSprite.position.set(screen.x, screen.y);
          foregroundSprite.zIndex = isoDepth(geometry.worldPoint(definition.depthBase ?? definition.position)) + (definition.depthBias ?? 0) + 0.1;
          foregroundLayer.addChild(foregroundSprite);
        }

        const content = definition.content ?? (definition.state ? definition.contentStates?.[definition.state] : undefined);
        if (content) {
          const contentNode = new PIXI.Container();
          const isLiveStage = definition.id === 'dj-stage';
          const panelWidth = isLiveStage ? 150 : 132;
          const panel = new PIXI.Graphics();
          panel.beginFill(0x10252d, 0.94);
          panel.lineStyle(1.5, content.accent ?? 0xf3cf78, 0.72);
          panel.drawRoundedRect(-panelWidth / 2, -26, panelWidth, 52, 9);
          panel.endFill();
          const eyebrow = new PIXI.Text(content.eyebrow ?? '', { fontFamily: 'Arial', fontSize: 7.5, fontWeight: 'bold', letterSpacing: 1.2, fill: content.accent ?? 0xf3cf78 });
          const title = new PIXI.Text(content.title, { fontFamily: 'Arial', fontSize: isLiveStage ? 13 : 11, fontWeight: 'bold', fill: 0xffffff });
          const detail = new PIXI.Text(content.detail ?? '', { fontFamily: 'Arial', fontSize: 7.5, fontWeight: 'bold', fill: 0xd8e8e3 });
          eyebrow.anchor.set(.5); eyebrow.y = -15;
          title.anchor.set(.5); title.y = 0;
          detail.anchor.set(.5); detail.y = 15;
          contentNode.addChild(panel, eyebrow, title, detail);
          contentNode.y = isLiveStage ? -sprite.height - 28 : -sprite.height * .58;
          node.addChild(contentNode);
        }

        if (editorRef.current?.enabled && editableObjectIds.has(definition.id)) {
          sprite.eventMode = 'static';
          sprite.cursor = 'pointer';
          sprite.on('pointerover', () => { node.scale.set(1.035); });
          sprite.on('pointerout', () => { node.scale.set(1); });
          sprite.on('pointertap', (event) => {
            event.stopPropagation();
            placeSelectionRing(definition.position);
            setSelection(null);
            editorRef.current?.onSelectObject(definition.id);
            onInteract(`${definition.id} selected. Click a free tile to move it.`);
          });
          if (editorRef.current?.selectedObjectId === definition.id) placeSelectionRing(definition.position);
        } else if (definition.interaction) {
          const badge = new PIXI.Graphics();
          badge.beginFill(0x172238, 0.9);
          badge.lineStyle(2, 0xffe38a, 0.62);
          badge.drawCircle(0, 0, 12);
          badge.endFill();
          badge.y = -sprite.height - 9;
          const icon = new PIXI.Text(definition.interaction.icon ?? '✦', { fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: 0xffe38a });
          icon.anchor.set(0.5);
          badge.addChild(icon);
          node.addChild(badge);
          sprite.eventMode = 'static';
          sprite.cursor = 'pointer';
          sprite.on('pointerover', () => { node.scale.set(1.025); badge.scale.set(1.12); });
          sprite.on('pointerout', () => { node.scale.set(1); badge.scale.set(1); });
          sprite.on('pointertap', (event) => {
            event.stopPropagation();
            placeSelectionRing(definition.position);
            setSelection({ ...definition.interaction!, sourceId: definition.id });
            onInteract(definition.interaction!.description);
          });
        }

        if (definition.id === 'fountain') {
          for (let particleIndex = 0; particleIndex < 7; particleIndex += 1) {
            const particle = new PIXI.Graphics();
            particle.beginFill(particleIndex % 2 === 0 ? 0xa9efff : 0xffefad, 0.78);
            particle.drawCircle(0, 0, particleIndex % 3 === 0 ? 2.2 : 1.4);
            particle.endFill();
            particle.x = (particleIndex - 3) * 11;
            particle.y = -sprite.height * 0.54 - (particleIndex % 3) * 7;
            node.addChild(particle);
            ambientParticles.push({ graphic: particle, baseY: particle.y, phase: particleIndex * 0.82 });
          }
        }
        if (definition.id === 'dj-stage') {
          for (let particleIndex = 0; particleIndex < 10; particleIndex += 1) {
            const particle = new PIXI.Graphics();
            particle.beginFill(particleIndex % 2 === 0 ? 0x6fe7ef : 0xff806c, 0.86);
            particle.drawRoundedRect(-2, -2, 4, 4, 1);
            particle.endFill();
            particle.x = -54 + particleIndex * 12;
            particle.y = -sprite.height * 0.46 + (particleIndex % 3) * 5;
            node.addChild(particle);
            ambientParticles.push({ graphic: particle, baseY: particle.y, phase: particleIndex * 0.37 });
          }
        }
        if (definition.ambient) animatedObjects.push({ node, sprite, baseY: sprite.y, mode: definition.ambient, offset: index, baseRotation: sprite.rotation });
        scene.addChild(node);
      });

      const showSpeech = (actor: Actor, value: string) => {
        if (actor.bubble) {
          actor.node.removeChild(actor.bubble);
          actor.bubble.destroy({ children: true });
        }
        const text = new PIXI.Text(value.slice(0, 72), { fontFamily: 'Arial', fontSize: 12.5, fontWeight: '600', fill: 0xf7fbfa, align: 'center', wordWrap: true, wordWrapWidth: 150, lineHeight: 17 });
        const width = Math.max(58, Math.min(166, text.width + 24));
        const height = text.height + 18;
        const background = new PIXI.Graphics();
        background.beginFill(0x102b32, 0.96);
        background.lineStyle(1.5, 0x9af3dc, 0.52);
        background.drawRoundedRect(-width / 2, -height, width, height, 13);
        background.moveTo(-8, 0);
        background.lineTo(0, 8);
        background.lineTo(8, 0);
        background.closePath();
        background.endFill();
        text.anchor.set(0.5, 1);
        text.y = -8;
        const bubble = new PIXI.Container();
        bubble.addChild(background, text);
        bubble.y = -108;
        bubble.zIndex = 20;
        actor.node.addChild(bubble);
        actor.bubble = bubble;
        actor.bubbleExpiresAt = app.ticker.lastTime + 3000;
      };

      const makeActor = (definition: RoomAvatarDefinition, index: number): Actor => {
        const createdAt = app.ticker.lastTime;
        const position = definition.player ? geometry.spawn : definition.position;
        const node = new PIXI.Container();
        const shadow = new PIXI.Sprite(textureFor(worldAssets.avatarShadow));
        const visual = new AvatarRenderer(definition.appearance, textureFor);
        shadow.anchor.set(0.5, 1);
        shadow.width = 76;
        shadow.scale.y = shadow.scale.x;
        shadow.alpha = 0.32;
        if (definition.player) {
          const playerHalo = new PIXI.Graphics();
          playerHalo.lineStyle(2, 0xffd76a, 0.72);
          playerHalo.beginFill(0xffd76a, 0.08);
          playerHalo.drawEllipse(0, -2, 29, 10);
          playerHalo.endFill();
          node.addChild(shadow, playerHalo, visual);
        } else node.addChild(shadow, visual);

        const nameText = new PIXI.Text(definition.name, { fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: definition.player ? 0xffe38a : 0xffffff });
        nameText.anchor.set(0.5);
        const nameplate = new PIXI.Container();
        const plate = new PIXI.Graphics();
        plate.beginFill(0x101827, 0.9);
        plate.lineStyle(1, definition.player ? 0xffd166 : 0x7ee8d0, 0.4);
        plate.drawRoundedRect(-nameText.width / 2 - 9, -10, nameText.width + 18, 20, 9);
        plate.endFill();
        const status = new PIXI.Graphics();
        status.beginFill(0x55e6ad);
        status.drawCircle(-nameText.width / 2 - 4, 0, 3);
        status.endFill();
        nameplate.addChild(plate, status, nameText);
        nameplate.y = -93;
        node.addChild(nameplate);

        const actor: Actor = {
          id: definition.id,
          node,
          visual,
          shadow,
          user: core.addUser(definition.id, position, definition.player ? 2.45 : 1.05),
          patrol: definition.patrol ?? [],
          waypointIndex: 0,
          nextMoveAt: createdAt + 1800 + index * 820,
          stepTravel: 0,
          bubbleExpiresAt: 0,
          ambientSpeech: definition.ambientSpeech ?? [],
          speechIndex: 0,
          nextSpeechAt: createdAt + 6200 + index * 3600,
          pose: definition.pose ?? 'stand',
          depthBias: definition.depthBias ?? 1,
          nameplate,
          emphasisUntil: definition.player ? Number.POSITIVE_INFINITY : 0,
          seatVisualOffset: 0,
          standingDepthBias: definition.depthBias ?? 1,
        };
        if (actor.pose === 'sit') {
          actor.patrol = [];
          const seat = room.objects
            .filter((object) => object.seat && !seatOccupants.has(object.id))
            .filter((object) => !definition.seatId || object.id === definition.seatId)
            .sort((first, second) => Math.hypot(first.position.x - definition.position.x, first.position.y - definition.position.y) - Math.hypot(second.position.x - definition.position.x, second.position.y - definition.position.y))[0];
          if (seat?.seat) {
            seatOccupants.set(seat.id, actor.id);
            actor.seatId = seat.id;
            actor.seatVisualOffset = seat.seat.visualOffset ?? 0;
            actor.depthBias = seat.seat.depthBias ?? actor.standingDepthBias;
            core.setUserSeat(actor.id, seat.seat.seatPosition, seat.seat.facing);
          } else {
            core.setUserPose(actor.id, 'sit');
          }
          visual.y = actor.seatVisualOffset;
          shadow.alpha = 0.2;
          nameplate.y = -82;
        }
        if (!definition.player) {
          visual.eventMode = 'static';
          visual.cursor = 'pointer';
          visual.hitArea = new PIXI.Rectangle(-42, -118, 84, 120);
          visual.on('pointerover', () => { node.scale.set(1.035); actor.nameplate.alpha = 1; actor.emphasisUntil = app.ticker.lastTime + 900; });
          visual.on('pointerout', () => node.scale.set(1));
          visual.on('pointertap', (event) => {
            event.stopPropagation();
            placeSelectionRing(actor.user.iso);
            setSelection({ sourceId: definition.id, title: definition.name, description: definition.activity ?? `${definition.name} is spending time in ${room.name}.`, actionLabel: 'View Profile', action: 'view-profile', targetId: definition.name, icon: '●' });
            showSpeech(actor, `Hey! I'm ${definition.name}.`);
            actor.emphasisUntil = app.ticker.lastTime + 4200;
            onInteract(`${definition.name} waves hello.`);
            const dx = player.user.iso.x - actor.user.iso.x;
            const dy = player.user.iso.y - actor.user.iso.y;
            const distance = Math.max(Math.hypot(dx, dy), 1);
            routeActor(player, { x: actor.user.iso.x + dx / distance * 0.9, y: actor.user.iso.y + dy / distance * 0.9 });
          });
        }
        scene.addChild(node);
        return actor;
      };

      const actors = room.avatars.map(makeActor);
      player = actors.find((_, index) => room.avatars[index].player) ?? actors[0];
      const residents = actors.filter((actor) => actor !== player);
      const placeActor = (actor: Actor) => {
        const world = geometry.worldPoint(actor.user.iso);
        const screen = isoToScreen(world);
        actor.node.position.set(screen.x, screen.y);
        actor.node.zIndex = isoDepth(world) + actor.depthBias;
      };
      actors.forEach(placeActor);
      scene.addChild(foregroundLayer);
      const spawnFootstep = (position: IsoPoint) => {
        const world = geometry.worldPoint(position);
        const screen = isoToScreen(world);
        const graphic = new PIXI.Graphics();
        graphic.beginFill(0x233f4a, 0.16);
        graphic.drawEllipse(0, 0, 9, 3);
        graphic.endFill();
        graphic.position.set(screen.x, screen.y);
        graphic.zIndex = isoDepth(world) - 3;
        scene.addChild(graphic);
        footsteps.push({ graphic, life: 1 });
      };

      const updateActorVisual = (actor: Actor, frame: RoomUserFrame, isPlayer: boolean) => {
        if (actor.user.pose === 'sit') {
          actor.visual.setPose('sit', actor.user.direction, 0);
          actor.visual.y = actor.seatVisualOffset;
          actor.shadow.alpha = 0.2;
          placeActor(actor);
          return;
        }
        actor.visual.setPose('stand', frame.direction, frame.animationFrame);
        actor.visual.y = 0;
        actor.shadow.alpha = frame.motion === 'walk' ? 0.24 : 0.31;
        if (isPlayer && frame.moved > 0) {
          actor.stepTravel += frame.moved;
          if (actor.stepTravel > 0.5) {
            spawnFootstep(actor.user.iso);
            actor.stepTravel = 0;
          }
        }
        placeActor(actor);
      };

      const completeInteraction = () => {
        if (!pendingInteraction) return;
        const { selection: interaction, object } = pendingInteraction;
        pendingInteraction = null;
        if (interaction.action === 'enter-room' && interaction.targetId) {
          onInteract(`Entering ${interaction.title}...`);
          showSpeech(player, `Let's go to ${interaction.title}.`);
          schedule(() => onEnterRoom?.(interaction.targetId!), 260);
          return;
        }
        if (interaction.action === 'sit' && object.seat) {
          const occupant = seatOccupants.get(object.id);
          if (occupant && occupant !== player.id) {
            onInteract(`${interaction.title} is already occupied.`);
            return;
          }
          if (player.seatId && player.seatId !== object.id) releaseSeat(player);
          seatOccupants.set(object.id, player.id);
          player.seatId = object.id;
          player.seatVisualOffset = object.seat.visualOffset ?? 0;
          player.depthBias = object.seat.depthBias ?? player.standingDepthBias;
          core.setUserSeat(player.id, object.seat.seatPosition, object.seat.facing);
          placeSelectionRing(object.seat.seatPosition);
          onInteract(`You sit on the ${object.catalogId ?? 'seat'}.`);
          showSpeech(player, 'Taking a quick break.');
          setSelection({ ...interaction, actionLabel: 'Stand up', description: 'You are sitting here. Stand up before moving through the Plaza.' });
          return;
        }
        core.setUserPose(player.id, 'interacting', interaction.facing);
        if (interaction.effect === 'fountain-wish') {
          for (let index = 0; index < 14; index += 1) {
            const particle = new PIXI.Graphics();
            particle.beginFill(index % 2 === 0 ? 0xa9efff : 0xffefad, 0.9);
            particle.drawCircle(0, 0, 2.4);
            particle.endFill();
            particle.position.set(0, -40);
            objectNodes.get(object.id)?.addChild(particle);
            fountainBurstParticles.push({ graphic: particle, velocityX: (index - 6.5) * 0.12, velocityY: -0.65 - (index % 4) * 0.08, life: 1 });
          }
          onInteract('Your wish ripples across the fountain.');
          showSpeech(player, 'I made a wish.');
        } else if (interaction.effect === 'join-event') {
          onInteract('You joined the Central Sessions crowd.');
          showSpeech(player, 'This set is incredible.');
        } else if (interaction.effect === 'read-events') {
          onInteract('Tonight: Central Sessions live, creator meetup next, gallery walk at eight.');
          showSpeech(player, 'Checking what is on tonight.');
        } else if (interaction.effect === 'view-placement') {
          onInteract('East Plaza Screen is showing Central Sessions live.');
          showSpeech(player, 'The Plaza screen is live.');
        } else {
          onInteract(`${interaction.actionLabel}: ${interaction.title}`);
          showSpeech(player, interaction.actionLabel);
        }
        schedule(() => {
          if (player.user.pose === 'interacting') core.setUserPose(player.id, 'stand');
        }, 850);
      };
      runtime.current = { say: (text) => showSpeech(player, text), execute: (interaction) => {
        const object = interactiveObjects.get(interaction.sourceId);
        if (!object) return;
        if (interaction.action === 'sit' && object.seat && seatOccupants.get(object.id) === player.id && player.user.pose === 'sit') {
          releaseSeat(player);
          core.setUserPose(player.id, 'stand');
          setSelection(null);
          onInteract('You stand up.');
          return;
        }
        if (interaction.action === 'sit' && object.seat && seatOccupants.has(object.id) && seatOccupants.get(object.id) !== player.id) {
          onInteract(`${interaction.title} is already occupied.`);
          return;
        }
        pendingInteraction = { selection: interaction, object };
        const target = object.seat?.approachPosition ?? object.interactionPoint;
        if (!target) { completeInteraction(); return; }
        if (!routeActor(player, target)) {
          pendingInteraction = null;
          onInteract('That interaction is not reachable right now.');
          return;
        }
        if (Math.hypot(player.user.iso.x - target.x, player.user.iso.y - target.y) < 0.6) completeInteraction();
      }, zoomBy: (amount) => camera.zoomBy(amount), recenter: () => camera.recenter(), selectEditorObject: (objectId) => {
        const definition = room.objects.find((object) => object.id === objectId);
        if (!definition) {
          selectionRing.visible = false;
          return;
        }
        placeSelectionRing(definition.position);
      } };

      scene.eventMode = 'static';
      const floorBounds = geometry.projectedFloorBounds();
      const minX = floorBounds.x - 120;
      const minY = floorBounds.y - 150;
      const maxX = floorBounds.x + floorBounds.width + 120;
      const maxY = floorBounds.y + floorBounds.height + 130;
      const roomBounds = new PIXI.Rectangle(minX, minY, maxX - minX, maxY - minY);
      camera.configure(roomBounds, geometry.spawn);
      scene.hitArea = new PIXI.Rectangle(roomBounds.x - 100, roomBounds.y - 100, roomBounds.width + 200, roomBounds.height + 200);
      let dragStart: PIXI.Point | null = null;
      let dragged = false;
      const activePointers = new Map<number, PIXI.Point>();
      let pinchDistance = 0;
      scene.on('pointerdown', (event) => {
        activePointers.set(event.pointerId, event.global.clone());
        if (activePointers.size === 2) {
          const [first, second] = [...activePointers.values()];
          pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
          dragStart = null;
          return;
        }
        dragStart = event.global.clone();
        dragged = false;
      });
      scene.on('pointermove', (event) => {
        if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, event.global.clone());
        if (activePointers.size === 2) {
          const [first, second] = [...activePointers.values()];
          const distance = Math.hypot(second.x - first.x, second.y - first.y);
          if (pinchDistance > 0) camera.zoomBy((distance - pinchDistance) / 280);
          pinchDistance = distance;
          dragged = true;
          return;
        }
        if (dragStart) {
          const next = event.global;
          const dx = next.x - dragStart.x;
          const dy = next.y - dragStart.y;
          if (Math.hypot(dx, dy) > 2) {
            camera.panBy(dx, dy);
            dragStart.copyFrom(next);
            dragged = true;
          }
          return;
        }
        const target = snapToTile(screenToIso(event.getLocalPosition(scene)));
        if (!insideFloor(target)) { tileCursor.visible = false; return; }
        drawTileCursor(target, blocked(target));
      });
      const releasePointer = (event: PIXI.FederatedPointerEvent) => {
        activePointers.delete(event.pointerId);
        pinchDistance = 0;
        dragStart = null;
      };
      scene.on('pointerup', releasePointer);
      scene.on('pointerupoutside', releasePointer);
      scene.on('pointerout', (event) => { tileCursor.visible = false; releasePointer(event); });
      scene.on('pointertap', (event) => {
        if (dragged) { dragged = false; return; }
        const target = snapToTile(screenToIso(event.getLocalPosition(scene)));
        const currentEditor = editorRef.current;
        if (currentEditor?.enabled && currentEditor.selectedObjectId) {
          if (insideFloor(target) && !blockedForEditor(target, currentEditor.selectedObjectId)) {
            currentEditor.onMoveObject(currentEditor.selectedObjectId, target);
            onInteract(`${currentEditor.selectedObjectId} moved to ${target.x}, ${target.y}. Save to keep the change.`);
          } else {
            onInteract('That tile cannot hold the selected object. Choose a free floor tile.');
          }
          return;
        }
        if (!blocked(target) && routeActor(player, target)) {
          pendingInteraction = null;
          placeSelectionRing(target);
          setSelection(null);
        } else {
          onInteract('That spot is not reachable. Choose another tile.');
        }
      });
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        camera.zoomBy(event.deltaY < 0 ? 0.08 : -0.08);
      };
      hostElement.addEventListener('wheel', onWheel, { passive: false });
      removeWheel = () => hostElement.removeEventListener('wheel', onWheel);

      let playerMoving = false;
      const layout = (immediate = false) => camera.layout(scene, app.screen, geometry.worldPoint(player.user.iso), playerMoving, immediate);
      const onResize = () => { renderAtmosphere(); layout(true); };
      app.renderer.on('resize', onResize);
      layout(true);

      app.ticker.add((delta) => {
        const time = app.ticker.lastTime;
        const deltaMs = app.ticker.deltaMS;
        const deltaSeconds = deltaMs / 1000;
        let dx = 0;
        let dy = 0;
        const keyboardStep = 2.45 * deltaSeconds;
        if (keys.has('w') || keys.has('arrowup')) { dx -= keyboardStep; dy -= keyboardStep; }
        if (keys.has('s') || keys.has('arrowdown')) { dx += keyboardStep; dy += keyboardStep; }
        if (keys.has('a') || keys.has('arrowleft')) { dx -= keyboardStep; dy += keyboardStep; }
        if (keys.has('d') || keys.has('arrowright')) { dx += keyboardStep; dy -= keyboardStep; }
        const inputMagnitude = Math.hypot(dx, dy);
        if (inputMagnitude > keyboardStep) { dx = dx / inputMagnitude * keyboardStep; dy = dy / inputMagnitude * keyboardStep; }
        if ((dx || dy) && player.user.pose === 'sit') releaseSeat(player);
        const playerFrame = dx || dy
          ? core.moveUserDirect(player.id, { x: dx, y: dy }, deltaMs)
          : core.tickUser(player.id, deltaSeconds, time);
        if (!playerFrame) return;
        playerMoving = playerFrame.moving;
        updateActorVisual(player, playerFrame, true);
        if (pendingInteraction) {
          const target = pendingInteraction.object.seat?.approachPosition ?? pendingInteraction.object.interactionPoint;
          if (target && Math.hypot(player.user.iso.x - target.x, player.user.iso.y - target.y) < 0.6) completeInteraction();
        }

        residents.forEach((actor, index) => {
          if (!actor.user.moving && actor.patrol.length > 1 && time > actor.nextMoveAt) {
            actor.waypointIndex = (actor.waypointIndex + 1) % actor.patrol.length;
            routeActor(actor, actor.patrol[actor.waypointIndex]);
            actor.nextMoveAt = time + 3400 + index * 620;
          }
          const residentFrame = core.tickUser(actor.id, deltaSeconds, time);
          if (residentFrame) updateActorVisual(actor, residentFrame, false);
          const distance = Math.hypot(actor.user.iso.x - player.user.iso.x, actor.user.iso.y - player.user.iso.y);
          const proximityAlpha = distance <= 3 ? .9 : distance <= 6 ? .58 : distance <= 9 ? .3 : .14;
          const targetNameplateAlpha = time < actor.emphasisUntil || actor.bubble ? 1 : proximityAlpha;
          actor.nameplate.alpha += (targetNameplateAlpha - actor.nameplate.alpha) * .12;
          if (!actor.bubble && actor.ambientSpeech.length > 0 && time > actor.nextSpeechAt) {
            showSpeech(actor, actor.ambientSpeech[actor.speechIndex % actor.ambientSpeech.length]);
            actor.speechIndex += 1;
            actor.nextSpeechAt = time + 26000 + index * 1150;
          }
        });

        actors.forEach((actor) => {
          if (actor.bubble && time > actor.bubbleExpiresAt) {
            actor.node.removeChild(actor.bubble);
            actor.bubble.destroy({ children: true });
            actor.bubble = undefined;
          }
        });
        animatedObjects.forEach(({ node, sprite, baseY, mode, offset, baseRotation }) => {
          if (mode === 'glow') node.alpha = 0.92 + Math.sin(time / 460 + offset) * 0.08;
          else if (mode === 'float') sprite.y = baseY + Math.sin(time / 900 + offset) * 1.1;
          else sprite.rotation = baseRotation + Math.sin(time / 1200 + offset) * 0.0035;
        });
        ambientParticles.forEach(({ graphic, baseY, phase }) => {
          const cycle = (time / 1250 + phase) % 1;
          graphic.y = baseY - cycle * 22;
          graphic.alpha = Math.sin(cycle * Math.PI) * 0.82;
          graphic.scale.set(0.7 + cycle * 0.5);
        });
        for (let index = fountainBurstParticles.length - 1; index >= 0; index -= 1) {
          const burst = fountainBurstParticles[index];
          burst.life -= deltaMs / 700;
          burst.graphic.x += burst.velocityX * deltaMs;
          burst.graphic.y += burst.velocityY * deltaMs;
          burst.velocityY += 0.0018 * deltaMs;
          burst.graphic.alpha = Math.max(0, burst.life);
          if (burst.life <= 0) {
            burst.graphic.destroy();
            fountainBurstParticles.splice(index, 1);
          }
        }
        selectionRing.alpha = 0.64 + Math.sin(time / 190) * 0.22;
        for (let index = footsteps.length - 1; index >= 0; index -= 1) {
          const step = footsteps[index];
          step.life -= delta * 0.04;
          step.graphic.alpha = Math.max(0, step.life * 0.22);
          step.graphic.scale.set(1 + (1 - step.life) * 0.35);
          if (step.life <= 0) {
            scene.removeChild(step.graphic);
            step.graphic.destroy();
            footsteps.splice(index, 1);
          }
        }
        layout();
      });
    })().catch(() => {
      if (!disposed) setLoadError(true);
    });

    return () => {
      disposed = true;
      runtime.current = null;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clearKeys);
      removeWheel();
      hostElement.replaceChildren();
      app.destroy(true, { children: true });
    };
  }, [loadAttempt, onEnterRoom, onInteract, onOpenProfile, onPresenceUpdate, room]);

  return (
    <div className="relative h-full w-full">
      <div ref={host} className="absolute inset-0 touch-none" />
      {loadError ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[#10252d]/95 p-6 text-center" role="alert">
          <div>
            <p className="font-black text-amber-50">This room could not finish loading.</p>
            <p className="mt-1 text-sm text-white/55">A visual resource was unavailable. You can retry safely.</p>
            <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-5 rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-black text-[#10252d] hover:bg-amber-100">Retry room</button>
          </div>
        </div>
      ) : null}
      <div className="absolute left-3 top-16 z-10 rounded-full border border-amber-100/15 bg-[#102a31]/82 px-3 py-1.5 text-[10px] font-bold text-amber-50 shadow-lg backdrop-blur-md sm:text-[11px]">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,.7)]" />{room.ui.subtitle}
      </div>
      <div className="absolute right-14 top-16 z-20 flex gap-0.5 rounded-full border border-white/10 bg-[#10252d]/72 p-1 shadow-lg backdrop-blur transition-opacity md:opacity-70 md:hover:opacity-100">
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => runtime.current?.zoomBy(-0.1)} className="grid h-8 w-8 place-items-center rounded-full text-amber-100 hover:bg-white/10"><Minus size={15} /></button>
        <button type="button" aria-label="Recenter camera" title="Recenter" onClick={() => runtime.current?.recenter()} className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/10"><LocateFixed size={15} /></button>
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => runtime.current?.zoomBy(0.1)} className="grid h-8 w-8 place-items-center rounded-full text-amber-100 hover:bg-white/10"><Plus size={15} /></button>
      </div>
      {import.meta.env.DEV ? <DevCatalogInspector room={room} /> : null}
      {selection ? (
        <section className="absolute bottom-20 left-3 right-3 z-20 rounded-2xl border border-amber-100/15 bg-[#10252d]/95 p-4 text-white shadow-2xl backdrop-blur-md md:left-auto md:right-4 md:w-72">
          <button type="button" aria-label="Close interaction" onClick={() => setSelection(null)} className="float-right text-slate-400 hover:text-white">×</button>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">{selection.icon} Room action</p>
          <h3 className="mt-1 text-lg font-black">{selection.title}</h3>
          <p className="mt-1 text-sm text-slate-300">{selection.description}</p>
          <button type="button" onClick={runAction} className="mt-3 w-full rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-black text-[#10252d] transition-colors hover:bg-amber-100">{selection.actionLabel}</button>
        </section>
      ) : null}
      <div className="pointer-events-none absolute bottom-20 left-1/2 hidden -translate-x-1/2 rounded-full border border-white/10 bg-[#10252d]/72 px-4 py-2 text-[11px] font-semibold text-white/80 backdrop-blur sm:block">{room.ui.help}</div>
    </div>
  );
}
