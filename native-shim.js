// Makes the app's existing Web Bluetooth code (navigator.bluetooth) work inside the APK
// by routing it to the native BLE plugin. In a normal browser this file does nothing.
import { Capacitor } from "@capacitor/core";
import { BleClient } from "@capacitor-community/bluetooth-le";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

if (Capacitor.isNativePlatform()) {
  const norm = (u) => String(u).toLowerCase();
  const toView = (dv) => new DataView(dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength));
  let inited = null;
  const init = () => (inited ||= BleClient.initialize({ androidNeverForLocation: true }));
  const IDS = "native_ble_ids";
  const savedIds = () => { try { return JSON.parse(localStorage.getItem(IDS)) || []; } catch { return []; } };
  const saveId = (id) => { try { localStorage.setItem(IDS, JSON.stringify([...new Set([id, ...savedIds()])].slice(0, 10))); } catch {} };

  class Char extends EventTarget {
    constructor(dev, svc, info) {
      super();
      this._d = dev; this._s = svc; this.uuid = norm(info.uuid);
      this.properties = {
        read: !!info.properties.read, write: !!info.properties.write,
        writeWithoutResponse: !!info.properties.writeWithoutResponse,
        notify: !!info.properties.notify, indicate: !!info.properties.indicate,
      };
      this.value = null;
    }
    async startNotifications() {
      await BleClient.startNotifications(this._d.id, this._s, this.uuid, (v) => {
        this.value = toView(v);
        this.dispatchEvent(new Event("characteristicvaluechanged"));
      });
      return this;
    }
    async stopNotifications() { await BleClient.stopNotifications(this._d.id, this._s, this.uuid); return this; }
    async readValue() { this.value = toView(await BleClient.read(this._d.id, this._s, this.uuid)); return this.value; }
    async writeValue(d) { await BleClient.write(this._d.id, this._s, this.uuid, new DataView(new Uint8Array(d).buffer)); }
    async writeValueWithoutResponse(d) { await BleClient.writeWithoutResponse(this._d.id, this._s, this.uuid, new DataView(new Uint8Array(d).buffer)); }
  }

  class Svc {
    constructor(dev, info) { this._d = dev; this.uuid = norm(info.uuid); this._c = info.characteristics; }
    async getCharacteristic(u) {
      const c = this._c.find((x) => norm(x.uuid) === norm(u));
      if (!c) throw new Error("Characteristic not found: " + u);
      return new Char(this._d, this.uuid, c);
    }
  }

  class Dev extends EventTarget {
    constructor(id, name) {
      super(); this.id = id; this.name = name || "";
      const self = this; this._svcs = [];
      this.gatt = {
        connected: false, device: this,
        async connect() {
          await init();
          await BleClient.connect(id, () => { self.gatt.connected = false; self.dispatchEvent(new Event("gattserverdisconnected")); });
          self._svcs = await BleClient.getServices(id);
          self.gatt.connected = true; saveId(id);
          return {
            connected: true,
            async getPrimaryService(u) {
              const s = self._svcs.find((x) => norm(x.uuid) === norm(u));
              if (!s) throw new Error("Service not found: " + u);
              return new Svc(self, s);
            },
          };
        },
        disconnect() { BleClient.disconnect(id).catch(() => {}); self.gatt.connected = false; },
      };
    }
  }

  Object.defineProperty(navigator, "bluetooth", {
    configurable: true,
    value: {
      async requestDevice(opts = {}) {
        await init();
        const d = await BleClient.requestDevice({ optionalServices: (opts.optionalServices || []).map(norm) });
        saveId(d.deviceId);
        return new Dev(d.deviceId, d.name);
      },
      async getDevices() {
        await init();
        const ids = savedIds(); if (!ids.length) return [];
        try { return (await BleClient.getDevices(ids)).map((d) => new Dev(d.deviceId, d.name)); } catch { return []; }
      },
    },
  });

  // Blob downloads do not work in a WebView: save to cache and open the share sheet instead.
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && this.href.startsWith("blob:")) {
      const name = this.download;
      fetch(this.href).then((r) => r.text()).then(async (text) => {
        const f = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: "utf8" });
        await Share.share({ title: name, url: f.uri });
      }).catch((e) => alert("Export failed: " + e.message));
      return;
    }
    return origClick.call(this);
  };
}
