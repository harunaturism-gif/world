import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { intersects, isoToScreen, type IsoPoint, screenToIso, TILE_HEIGHT, TILE_WIDTH } from './isometric';
import type { PlayerSpeech, RoomAvatarDefinition, RoomDefinition, RoomSelection } from './roomEngine';
import { worldAssets } from './worldManifest';

interface Props {
  room: RoomDefinition;
  onInteract: (message: string) => void;
  onEnterRoom?: (roomId: string) => void;
  onOpenProfile?: (username: string) => void;
  onPresenceUpdate?: (count: number) => void;
  playerSpeech?: PlayerSpeech | null;
}

type MotionState = 'idle' | 'walking';

interface Actor {
  id: string;
  node: PIXI.Container;
  visual: PIXI.Container;
  shadow: PIXI.Sprite;
  position: IsoPoint;
  target: IsoPoint;
  motion: MotionState;
  facing: -1 | 1;
  patrol: IsoPoint[];
  waypointIndex: number;
  nextMoveAt: number;
  stepTravel: number;
  bubble?: PIXI.Container;
  bubbleExpiresAt: number;
}

interface AnimatedObject {
  node: PIXI.Container;
  sprite: PIXI.Sprite;
  baseY: number;
  mode: 'glow' | 'float';
  offset: number;
}

interface Footstep { graphic: PIXI.Graphics; life: number; }
interface SceneRuntime { say: (text: string) => void; }

const avatarAssetUrls = [worldAssets.avatarShadow, worldAssets.avatarBody, worldAssets.avatarSkin, worldAssets.avatarHair, worldAssets.avatarAccessory];
const snapToTile = (point: IsoPoint): IsoPoint => ({ x: Math.round(point.x * 2) / 2, y: Math.round(point.y * 2) / 2 });

export function IsometricRoomEngine({ room, onInteract, onEnterRoom, onOpenProfile, onPresenceUpdate, playerSpeech }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<SceneRuntime | null>(null);
  const [selection, setSelection] = useState<RoomSelection | null>(null);

  const runAction = () => {
    if (!selection) return;
    if (selection.action === 'enter-room' && selection.targetId) {
      onInteract(`Entering ${selection.title}…`);
      runtime.current?.say(`Let's go to ${selection.title}.`);
      window.setTimeout(() => onEnterRoom?.(selection.targetId!), 260);
    } else if (selection.action === 'view-profile' && selection.targetId) {
      onOpenProfile?.(selection.targetId);
    } else {
      const feedback = `${selection.actionLabel}: ${selection.title}`;
      onInteract(feedback);
      runtime.current?.say(selection.action === 'sit' ? 'Taking a quick break.' : selection.actionLabel);
    }
  };

  useEffect(() => {
    if (playerSpeech?.text) runtime.current?.say(playerSpeech.text);
  }, [playerSpeech]);

  useEffect(() => {
    if (!host.current) return;
    const app = new PIXI.Application({ resizeTo: host.current, backgroundColor: 0x132138, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
    host.current.appendChild(app.view as HTMLCanvasElement);
    const scene = new PIXI.Container();
    scene.sortableChildren = true;
    app.stage.addChild(scene);
    const keys = new Set<string>();
    const footsteps: Footstep[] = [];
    let disposed = false;
    let player: Actor;

    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
      keys.add(key);
    };
    const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    addEventListener('keydown', keyDown);
    addEventListener('keyup', keyUp);

    void (async () => {
      const urls = Array.from(new Set([room.floor.asset, room.floor.boundaryAsset, ...avatarAssetUrls, ...room.objects.map((object) => object.asset)]));
      const textures = new Map<string, PIXI.Texture>(await Promise.all(urls.map(async (url) => [url, await PIXI.Assets.load<PIXI.Texture>(url)] as const)));
      if (disposed) return;
      const textureFor = (url: string) => textures.get(url) ?? PIXI.Texture.EMPTY;
      onPresenceUpdate?.(room.avatars.length);

      for (let x = room.floor.minX; x <= room.floor.maxX; x += 1) {
        for (let y = room.floor.minY; y <= room.floor.maxY; y += 1) {
          const edge = x === room.floor.minX || x === room.floor.maxX || y === room.floor.minY || y === room.floor.maxY;
          const tile = new PIXI.Sprite(textureFor(edge ? room.floor.boundaryAsset : room.floor.asset));
          const screen = isoToScreen({ x, y });
          tile.anchor.set(.5);
          tile.width = TILE_WIDTH + 1;
          tile.height = TILE_HEIGHT + 1;
          tile.position.set(screen.x, screen.y);
          tile.zIndex = -10000 + screen.y;
          scene.addChild(tile);
        }
      }

      const tileCursor = new PIXI.Graphics();
      tileCursor.visible = false;
      scene.addChild(tileCursor);
      const drawTileCursor = (point: IsoPoint, occupied: boolean) => {
        const screen = isoToScreen(point);
        tileCursor.clear();
        tileCursor.lineStyle(3, occupied ? 0xff718e : 0x75f3da, .95);
        tileCursor.beginFill(occupied ? 0xff5475 : 0x44d7c0, .14);
        tileCursor.drawPolygon([0, -18, 36, 0, 0, 18, -36, 0]);
        tileCursor.endFill();
        tileCursor.position.set(screen.x, screen.y);
        tileCursor.zIndex = screen.y - 2;
        tileCursor.visible = true;
      };

      const selectionRing = new PIXI.Graphics();
      selectionRing.lineStyle(3, 0xffe38a, .95);
      selectionRing.beginFill(0xffd166, .08);
      selectionRing.drawEllipse(0, 0, 29, 11);
      selectionRing.endFill();
      selectionRing.visible = false;
      scene.addChild(selectionRing);
      const placeSelectionRing = (point: IsoPoint) => {
        const screen = isoToScreen(point);
        selectionRing.position.set(screen.x, screen.y + 2);
        selectionRing.zIndex = screen.y - 1;
        selectionRing.visible = true;
      };

      const insideFloor = (point: IsoPoint) => point.x >= room.floor.minX + .35 && point.x <= room.floor.maxX - .35 && point.y >= room.floor.minY + .35 && point.y <= room.floor.maxY - .35;
      const blocked = (point: IsoPoint) => !insideFloor(point) || room.objects.some((object) => object.collision && intersects(point, object.collision));
      const animatedObjects: AnimatedObject[] = [];

      room.objects.forEach((definition, index) => {
        const node = new PIXI.Container();
        const sprite = new PIXI.Sprite(textureFor(definition.asset));
        const screen = isoToScreen(definition.position);
        sprite.anchor.set(.5, 1);
        sprite.width = definition.displayWidth;
        sprite.scale.y = sprite.scale.x;
        node.addChild(sprite);
        node.position.set(screen.x, screen.y);
        node.zIndex = screen.y + (definition.depthBias ?? 0);
        node.name = definition.id;

        if (definition.interaction) {
          const badge = new PIXI.Graphics();
          badge.beginFill(0x14213a, .88);
          badge.lineStyle(2, 0xffe38a, .7);
          badge.drawCircle(0, 0, 13);
          badge.endFill();
          badge.y = -sprite.height - 10;
          const icon = new PIXI.Text(definition.interaction.icon ?? '✦', { fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold', fill: 0xffe38a });
          icon.anchor.set(.5);
          badge.addChild(icon);
          node.addChild(badge);
          sprite.eventMode = 'static';
          sprite.cursor = 'pointer';
          sprite.on('pointerover', () => node.scale.set(1.035));
          sprite.on('pointerout', () => node.scale.set(1));
          sprite.on('pointertap', (event) => {
            event.stopPropagation();
            placeSelectionRing(definition.position);
            setSelection({ ...definition.interaction!, sourceId: definition.id });
            onInteract(definition.interaction!.description);
            if (definition.interactionPoint && !blocked(definition.interactionPoint)) player.target = { ...definition.interactionPoint };
          });
        }

        if (definition.ambient) animatedObjects.push({ node, sprite, baseY: sprite.y, mode: definition.ambient, offset: index });
        scene.addChild(node);
      });

      const showSpeech = (actor: Actor, value: string) => {
        if (actor.bubble) {
          actor.node.removeChild(actor.bubble);
          actor.bubble.destroy({ children: true });
        }
        const text = new PIXI.Text(value.slice(0, 72), { fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: 0x17213d, align: 'center', wordWrap: true, wordWrapWidth: 142, lineHeight: 17 });
        const width = Math.max(54, Math.min(158, text.width + 22));
        const height = text.height + 16;
        const background = new PIXI.Graphics();
        background.beginFill(0xf7fbff, .97);
        background.lineStyle(2, 0x17213d, .18);
        background.drawRoundedRect(-width / 2, -height, width, height, 12);
        background.moveTo(-8, 0);
        background.lineTo(0, 8);
        background.lineTo(8, 0);
        background.closePath();
        background.endFill();
        text.anchor.set(.5, 1);
        text.y = -8;
        const bubble = new PIXI.Container();
        bubble.addChild(background, text);
        bubble.y = -116;
        bubble.zIndex = 20;
        actor.node.addChild(bubble);
        actor.bubble = bubble;
        actor.bubbleExpiresAt = app.ticker.lastTime + 2800;
      };

      const makeActor = (definition: RoomAvatarDefinition, index: number): Actor => {
        const position = definition.player ? room.spawn : definition.position;
        const node = new PIXI.Container();
        const shadow = new PIXI.Sprite(textureFor(worldAssets.avatarShadow));
        const visual = new PIXI.Container();
        const addLayer = (url: string, tint?: number) => {
          const sprite = new PIXI.Sprite(textureFor(url));
          sprite.anchor.set(.5, 1);
          sprite.width = 66;
          sprite.scale.y = sprite.scale.x;
          if (tint !== undefined) sprite.tint = tint;
          visual.addChild(sprite);
        };

        shadow.anchor.set(.5, 1);
        shadow.width = 70;
        shadow.scale.y = shadow.scale.x;
        node.addChild(shadow, visual);
        addLayer(worldAssets.avatarBody, definition.palette.outfit);
        addLayer(worldAssets.avatarSkin, definition.palette.skin);
        addLayer(worldAssets.avatarHair, definition.palette.hair);
        addLayer(worldAssets.avatarAccessory, definition.palette.accessory);

        const nameText = new PIXI.Text(definition.name, { fontFamily: 'Arial', fontWeight: 'bold', fontSize: 12, fill: definition.player ? 0xffe38a : 0xffffff });
        nameText.anchor.set(.5);
        const nameplate = new PIXI.Container();
        const plate = new PIXI.Graphics();
        plate.beginFill(0x101827, .88);
        plate.lineStyle(1, definition.player ? 0xffd166 : 0x7ee8d0, .45);
        plate.drawRoundedRect(-nameText.width / 2 - 8, -9, nameText.width + 16, 18, 8);
        plate.endFill();
        const status = new PIXI.Graphics();
        status.beginFill(0x55e6ad);
        status.drawCircle(-nameText.width / 2 - 3, 0, 3);
        status.endFill();
        nameplate.addChild(plate, status, nameText);
        nameplate.y = -96;
        node.addChild(nameplate);

        const actor: Actor = { id: definition.id, node, visual, shadow, position: { ...position }, target: { ...position }, motion: 'idle', facing: 1, patrol: definition.patrol ?? [], waypointIndex: 0, nextMoveAt: 2200 + index * 900, stepTravel: 0, bubbleExpiresAt: 0 };
        if (!definition.player) {
          visual.eventMode = 'static';
          visual.cursor = 'pointer';
          visual.hitArea = new PIXI.Rectangle(-34, -110, 68, 112);
          visual.on('pointerover', () => node.scale.set(1.045));
          visual.on('pointerout', () => node.scale.set(1));
          visual.on('pointertap', (event) => {
            event.stopPropagation();
            placeSelectionRing(actor.position);
            setSelection({ sourceId: definition.id, title: definition.name, description: `${definition.name} is spending time in ${room.name}.`, actionLabel: 'View Profile', action: 'view-profile', targetId: definition.name, icon: '●' });
            showSpeech(actor, `Hey! I'm ${definition.name}.`);
            onInteract(`${definition.name} waves hello.`);
            const dx = player.position.x - actor.position.x;
            const dy = player.position.y - actor.position.y;
            const distance = Math.max(Math.hypot(dx, dy), 1);
            const approach = { x: actor.position.x + dx / distance * .85, y: actor.position.y + dy / distance * .85 };
            if (!blocked(approach)) player.target = approach;
          });
        }
        scene.addChild(node);
        return actor;
      };

      const actors = room.avatars.map(makeActor);
      player = actors.find((_, index) => room.avatars[index].player) ?? actors[0];
      const residents = actors.filter((actor) => actor !== player);
      const placeActor = (actor: Actor) => {
        const screen = isoToScreen(actor.position);
        actor.node.position.set(screen.x, screen.y);
        actor.node.zIndex = screen.y + 1;
      };
      actors.forEach(placeActor);
      runtime.current = { say: (text) => showSpeech(player, text) };

      const spawnFootstep = (position: IsoPoint) => {
        const screen = isoToScreen(position);
        const graphic = new PIXI.Graphics();
        graphic.lineStyle(2, 0xa9f4e4, .45);
        graphic.drawEllipse(0, 0, 12, 4);
        graphic.position.set(screen.x, screen.y);
        graphic.zIndex = screen.y - 3;
        scene.addChild(graphic);
        footsteps.push({ graphic, life: 1 });
      };

      const moveActor = (actor: Actor, delta: number, speed: number, isPlayer: boolean) => {
        const dx = actor.target.x - actor.position.x;
        const dy = actor.target.y - actor.position.y;
        const distance = Math.hypot(dx, dy);
        let moved = 0;
        if (distance > .025) {
          const step = Math.min(speed * delta, distance);
          const full = { x: actor.position.x + dx / distance * step, y: actor.position.y + dy / distance * step };
          const slideX = { x: full.x, y: actor.position.y };
          const slideY = { x: actor.position.x, y: full.y };
          const previous = { ...actor.position };
          if (!blocked(full)) actor.position = full;
          else if (isPlayer && !blocked(slideX)) actor.position = slideX;
          else if (isPlayer && !blocked(slideY)) actor.position = slideY;
          else actor.target = { ...actor.position };
          moved = Math.hypot(actor.position.x - previous.x, actor.position.y - previous.y);
          actor.motion = moved > 0 ? 'walking' : 'idle';
          if (moved > 0) {
            const before = isoToScreen(previous);
            const after = isoToScreen(actor.position);
            actor.facing = after.x < before.x ? -1 : 1;
          }
        } else {
          actor.position = { ...actor.target };
          actor.motion = 'idle';
        }
        if (isPlayer && moved > 0) {
          actor.stepTravel += moved;
          if (actor.stepTravel > .52) {
            spawnFootstep(actor.position);
            actor.stepTravel = 0;
          }
        }
        placeActor(actor);
      };

      scene.eventMode = 'static';
      scene.hitArea = new PIXI.Rectangle(-950, -460, 1900, 980);
      scene.on('pointermove', (event) => {
        const target = snapToTile(screenToIso(event.getLocalPosition(scene)));
        if (!insideFloor(target)) { tileCursor.visible = false; return; }
        drawTileCursor(target, blocked(target));
      });
      scene.on('pointerout', () => { tileCursor.visible = false; });
      scene.on('pointertap', (event) => {
        const target = snapToTile(screenToIso(event.getLocalPosition(scene)));
        if (!blocked(target)) {
          player.target = target;
          placeSelectionRing(target);
          setSelection(null);
        } else {
          onInteract('That tile is occupied. Choose another spot.');
        }
      });

      const layout = () => {
        const compact = app.screen.width < 640;
        const scale = compact ? Math.min(app.screen.width / 760, app.screen.height / 560, .72) : Math.min(app.screen.width / 1120, app.screen.height / 680, 1);
        scene.scale.set(scale);
        scene.position.set(app.screen.width / 2, compact ? app.screen.height * .36 : Math.max(195 * scale, app.screen.height * .4));
      };
      app.renderer.on('resize', layout);
      layout();

      app.ticker.add((delta) => {
        const time = app.ticker.lastTime;
        const keyboardStep = .052 * delta;
        let dx = 0;
        let dy = 0;
        if (keys.has('w') || keys.has('arrowup')) { dx -= keyboardStep; dy -= keyboardStep; }
        if (keys.has('s') || keys.has('arrowdown')) { dx += keyboardStep; dy += keyboardStep; }
        if (keys.has('a') || keys.has('arrowleft')) { dx -= keyboardStep; dy += keyboardStep; }
        if (keys.has('d') || keys.has('arrowright')) { dx += keyboardStep; dy -= keyboardStep; }
        if (dx || dy) player.target = { x: player.position.x + dx, y: player.position.y + dy };

        residents.forEach((actor, index) => {
          if (actor.motion === 'idle' && actor.patrol.length > 1 && time > actor.nextMoveAt) {
            actor.waypointIndex = (actor.waypointIndex + 1) % actor.patrol.length;
            actor.target = { ...actor.patrol[actor.waypointIndex] };
            actor.nextMoveAt = time + 3600 + index * 650;
          }
        });

        moveActor(player, delta, .07, true);
        residents.forEach((actor) => moveActor(actor, delta, .024, false));
        actors.forEach((actor, index) => {
          const walking = actor.motion === 'walking';
          const phase = time / (walking ? 82 : 560) + index * .7;
          actor.visual.y = Math.sin(phase) * (walking ? 2.5 : .65);
          actor.visual.rotation = walking ? Math.sin(phase) * .018 : 0;
          actor.visual.scale.set(actor.facing * (walking ? 1 + Math.sin(phase) * .018 : 1), walking ? 1 - Math.sin(phase) * .012 : 1);
          actor.shadow.scale.x = (70 / actor.shadow.texture.width) * (walking ? .94 : 1);
          actor.shadow.alpha = walking ? .23 : .3;
          if (actor.bubble && time > actor.bubbleExpiresAt) {
            actor.node.removeChild(actor.bubble);
            actor.bubble.destroy({ children: true });
            actor.bubble = undefined;
          }
        });

        animatedObjects.forEach(({ node, sprite, baseY, mode, offset }) => {
          if (mode === 'glow') node.alpha = .9 + Math.sin(time / 420 + offset) * .1;
          else sprite.y = baseY + Math.sin(time / 850 + offset) * 1.3;
        });
        selectionRing.alpha = .62 + Math.sin(time / 170) * .25;
        for (let index = footsteps.length - 1; index >= 0; index -= 1) {
          const step = footsteps[index];
          step.life -= delta * .035;
          step.graphic.alpha = Math.max(0, step.life * .45);
          step.graphic.scale.set(1 + (1 - step.life) * .5);
          if (step.life <= 0) {
            scene.removeChild(step.graphic);
            step.graphic.destroy();
            footsteps.splice(index, 1);
          }
        }
      });
    })();

    return () => {
      disposed = true;
      runtime.current = null;
      removeEventListener('keydown', keyDown);
      removeEventListener('keyup', keyUp);
      app.destroy(true, { children: true });
    };
  }, [onInteract, onOpenProfile, onPresenceUpdate, room]);

  return <div className="relative h-full w-full"><div ref={host} className="absolute inset-0 touch-none"/><div className="absolute left-3 top-3 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1.5 text-xs font-bold text-cyan-100 backdrop-blur"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400"/>{room.ui.subtitle}</div>{selection && <section className="absolute bottom-24 left-3 right-3 z-20 rounded-2xl border border-white/15 bg-[#111a30]/95 p-4 text-white shadow-2xl backdrop-blur md:left-auto md:right-4 md:w-72"><button aria-label="Close interaction" onClick={() => setSelection(null)} className="float-right text-slate-400 hover:text-white">×</button><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">{selection.icon} Interaction</p><h3 className="mt-1 text-lg font-black">{selection.title}</h3><p className="mt-1 text-sm text-slate-300">{selection.description}</p><button onClick={runAction} className="mt-3 w-full rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-200">{selection.actionLabel}</button></section>}<div className="pointer-events-none absolute bottom-24 left-1/2 hidden -translate-x-1/2 rounded-full bg-slate-950/75 px-4 py-2 text-xs text-white/85 backdrop-blur sm:block">{room.ui.help}</div></div>;
}
