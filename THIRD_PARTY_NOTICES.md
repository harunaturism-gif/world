# Third-Party Notices

## Open Hotel Client

Human World's social-room rebuild was informed by the room-engine architecture of the Open Hotel Client project:

- Project: https://github.com/open-hotel/open-hotel-client
- Copyright (c) 2019 Open Hotel
- License: MIT

The reference study covered room-owned height maps, floor and wall lifecycle, user world coordinates, interactive floor cells, avatar animation state, and position-derived depth ordering. Human World implements these ideas independently in TypeScript, React, and PixiJS through its existing `roomEngine`, `RoomGeometry`, `worldManifest`, and `IsometricRoomEngine` modules.

No Open Hotel, Habbo, or Sulake assets were copied. No substantial literal Open Hotel source code was incorporated.

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
