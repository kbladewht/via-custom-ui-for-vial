import { WebUsbComInterface } from "../../webUsbComInterface";

// Nordic UART Service UUIDs
const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_NOTIFY_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_WRITE_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const VIAL_PACKET_SIZE = 32;
const BLE_FRAME_SIZE = VIAL_PACKET_SIZE + 2;
const BLE_DEVICE_NAME_KEYWORDS = ["P42", "BLE", "P16"];
const GATT_OPERATION_TIMEOUT_MS = 5000;
const GATT_SERVICE_DISCOVERY_RETRY_DELAY_MS = 300;

class WebBtNus implements WebUsbComInterface {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | undefined = undefined;
  private nusService: BluetoothRemoteGATTService | null = null;
  private txCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private receiveCallback: ((msg: Uint8Array) => void) | null = null;
  private closeCallback: () => void = () => {};
  private rxListenerAdded: boolean = false;
  private nextSequence = 0;
  private expectedSequences: number[] = [];
  private disconnectListenerAdded: boolean = false;
  private closePromise: Promise<void> | null = null;
  
  // Reference to event handlers for removal
  private onCharacteristicValueChanged = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (value) {
      const packet = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      console.log(
        `BLE NUS receive (${packet.byteLength}): ${Array.from(packet)
          .map((byte) => byte.toString(16))
          .join(" ")}`,
      );
      if (packet.byteLength !== BLE_FRAME_SIZE) {
        console.warn("BLE NUS ignored invalid frame length");
        return;
      }
      const sequence = packet[0] | (packet[1] << 8);
      const expectedIndex = this.expectedSequences.indexOf(sequence);
      if (expectedIndex < 0) {
        // console.warn(`BLE NUS ignored sequence ${sequence}`);
        return;
      }
      if (expectedIndex !== 0) {
        console.warn(
          `BLE NUS ignored out-of-order sequence ${sequence}, expected ${this.expectedSequences[0]}`,
        );
        return;
      }
      this.expectedSequences.shift();
      this.receiveCallback?.(Uint8Array.from(packet.slice(2)));
    }
  };
  
  private onGattServerDisconnected = (event: Event) => {
    if (event.target !== this.device) {
      return;
    }

    void this.close().finally(() => {
      this.closeCallback();
    });
  };

  private async withGattTimeout<T>(operation: Promise<T>, operationName: string): Promise<T> {
    let timeoutId: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error(`BLE NUS ${operationName} timed out`));
      }, GATT_OPERATION_TIMEOUT_MS);
    });

    try {
      return await Promise.race([operation, timeout]);
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private prepareForDeviceChooser(): BluetoothDevice | null {
    const previousDevice = this.device;

    if (this.rxCharacteristic) {
      if (this.rxListenerAdded) {
        this.rxCharacteristic.removeEventListener("characteristicvaluechanged", this.onCharacteristicValueChanged);
        this.rxListenerAdded = false;
      }
      void this.rxCharacteristic.stopNotifications().catch((error) => {
        console.warn("BLE NUS could not stop notifications", error);
      });
    }

    if (previousDevice && this.disconnectListenerAdded) {
      previousDevice.removeEventListener("gattserverdisconnected", this.onGattServerDisconnected);
      this.disconnectListenerAdded = false;
    }

    if (this.server?.connected) {
      this.server.disconnect();
    }

    this.device = null;
    this.server = undefined;
    this.nusService = null;
    this.txCharacteristic = null;
    this.rxCharacteristic = null;
    this.expectedSequences = [];

    return previousDevice;
  }

  get connected(): boolean {
    return this.device !== null && this.server?.connected === true;
  }

  setReceiveCallback(recvHandler: ((msg: Uint8Array) => void) | null): void {
    this.receiveCallback = recvHandler;

    if (this.rxCharacteristic) {
      // Remove existing listener if present
      if (this.rxListenerAdded) {
        this.rxCharacteristic.removeEventListener("characteristicvaluechanged", this.onCharacteristicValueChanged);
        this.rxListenerAdded = false;
      }
      
      if (recvHandler) {
        const characteristic = this.rxCharacteristic;
        characteristic.addEventListener("characteristicvaluechanged", this.onCharacteristicValueChanged);
        this.rxListenerAdded = true;
      } else {
        // Stop notifications if callback is removed
        this.rxCharacteristic.stopNotifications().catch((e) => console.error(e));
      }
    }
  }

  setCloseCallback(handler: (() => void) | null): void {
    this.closeCallback = handler || (() => {});

    if (this.device) {
      // Remove existing listener if present
      if (this.disconnectListenerAdded) {
        this.device.removeEventListener("gattserverdisconnected", this.onGattServerDisconnected);
        this.disconnectListenerAdded = false;
      }
      
      // Add new listener
      this.device.addEventListener("gattserverdisconnected", this.onGattServerDisconnected);
      this.disconnectListenerAdded = true;
    }
  }

  async getDeviceList(): Promise<
    {
      name: string;
      vid: number;
      pid: number;
      opened: boolean;
      usage: number[];
      usagePage: number[];
    }[]
  > {
    return []
  }

  async open(deviceIndex: number, onConnect: (() => void) | null, _param: object): Promise<void> {

    try {
    const previousDevice = this.prepareForDeviceChooser();

    const forget = (previousDevice as BluetoothDevice & {
      forget?: () => Promise<void>;
    } | null)?.forget;
    if (forget) {
      void forget.call(previousDevice).catch((error) => {
        console.warn("BLE NUS could not forget the previous device", error);
      });
    }

    console.log("BLE NUS old session destroyed; opening device chooser");

    const devices = [undefined]
      this.device =
        devices.at(deviceIndex) ?? 
        (await navigator.bluetooth.requestDevice({
          filters: BLE_DEVICE_NAME_KEYWORDS.map((namePrefix) => ({ namePrefix })),
          optionalServices: [NUS_SERVICE_UUID],
        }));

      const deviceName = this.device.name ?? "";
      if (!BLE_DEVICE_NAME_KEYWORDS.some((keyword) =>
        deviceName.toLowerCase().includes(keyword.toLowerCase()),
      )) {
        throw new Error(`Selected Bluetooth device is not supported: ${deviceName}`);
      }

      console.log("BLE NUS connecting:", deviceName);
      this.server = await this.device.gatt?.connect();
      if (!this.server) {
        throw new Error("Failed to connect to GATT server");
      }
      console.log("BLE NUS GATT connected");

      // Get NUS service
      console.log("BLE NUS looking up service");
      try {
        this.nusService = await this.withGattTimeout(
          this.server.getPrimaryService(NUS_SERVICE_UUID),
          "service lookup",
        );
      } catch (error) {
        const selectedDevice = this.device;
        console.warn("BLE NUS service lookup failed; reconnecting GATT once", error);
        await this.close();
        await this.wait(GATT_SERVICE_DISCOVERY_RETRY_DELAY_MS);
        this.device = selectedDevice;
        this.server = await this.device.gatt?.connect();
        if (!this.server) {
          throw new Error("Failed to reconnect to GATT server");
        }
        console.log("BLE NUS GATT reconnected");
        this.nusService = await this.withGattTimeout(
          this.server.getPrimaryService(NUS_SERVICE_UUID),
          "service lookup retry",
        );
      }
      console.log("BLE NUS service found");

      // Select endpoints by their advertised properties. This firmware uses
      // the opposite UUID direction from the Nordic NUS naming convention.
      const characteristics = await this.withGattTimeout(Promise.all([
        this.nusService.getCharacteristic(NUS_NOTIFY_CHARACTERISTIC_UUID),
        this.nusService.getCharacteristic(NUS_WRITE_CHARACTERISTIC_UUID),
      ]), "characteristic lookup");
      this.txCharacteristic = characteristics.find(
        (characteristic) =>
          characteristic.properties.write ||
          characteristic.properties.writeWithoutResponse,
      ) ?? null;
      this.rxCharacteristic = characteristics.find(
        (characteristic) => characteristic.properties.notify,
      ) ?? null;

      if (!this.txCharacteristic || !this.rxCharacteristic) {
        throw new Error("NUS characteristics do not expose write and notify properties");
      }

      console.log("BLE NUS endpoints:", {
        write: this.txCharacteristic.uuid,
        notify: this.rxCharacteristic.uuid,
      });

      await this.rxCharacteristic.startNotifications();
      console.log("BLE NUS notifications started");

      // Set up disconnect listener
      if (this.disconnectListenerAdded) {
        this.device.removeEventListener("gattserverdisconnected", this.onGattServerDisconnected);
      }
      this.device.addEventListener("gattserverdisconnected", this.onGattServerDisconnected);
      this.disconnectListenerAdded = true;

      // Setup receive callback if already defined
      if (this.receiveCallback) {
        this.setReceiveCallback(this.receiveCallback);
      }

      // Call onConnect callback if provided
      if (onConnect) {
        onConnect();
      }

      console.log("BLE NUS connection opened");
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : "Error";
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error opening BLE NUS connection (${errorName}): ${errorMessage}`, error);
      await this.close();
      throw new Error(`BLE NUS connection failed (${errorName}): ${errorMessage || "unknown error"}`);
    }
  }

  async close(): Promise<void> {
    if (this.closePromise) {
      return this.closePromise;
    }

    this.closePromise = this.closeInternal().finally(() => {
      this.closePromise = null;
    });
    return this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    try {
      // Clean up notification listeners
      if (this.rxCharacteristic) {
        if (this.rxListenerAdded) {
          this.rxCharacteristic.removeEventListener("characteristicvaluechanged", this.onCharacteristicValueChanged);
          this.rxListenerAdded = false;
        }
        await this.rxCharacteristic.stopNotifications().catch((e) => console.error(e));
      }

      // Clean up disconnect listener
      if (this.device && this.disconnectListenerAdded) {
        this.device.removeEventListener("gattserverdisconnected", this.onGattServerDisconnected);
        this.disconnectListenerAdded = false;
      }

      if (this.server && this.server.connected) {
        this.server.disconnect();
      }

      // Reset state
      this.device = null;
      this.server = undefined;
      this.nusService = null;
      this.txCharacteristic = null;
      this.rxCharacteristic = null;
      this.nextSequence = 0;
      this.expectedSequences = [];

      console.log("BLE NUS connection closed");
    } catch (error) {
      console.error("Error closing BLE NUS connection:", error);
    }
  }

  async writeString(msg: string): Promise<void> {
    if (!this.connected || !this.txCharacteristic) {
      throw new Error("Not connected");
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(msg);
      await this.write(data);
    } catch (error) {
      console.error("Error writing string to BLE NUS:", error);
      throw error;
    }
  }

  async write(msg: Uint8Array): Promise<void> {
    if (!this.connected || !this.txCharacteristic) {
      throw new Error("Not connected");
    }

    try {
      if (msg.length > VIAL_PACKET_SIZE) {
        throw new Error(`Vial packet is too large: ${msg.length} bytes`);
      }

      // The firmware accepts one complete 32-byte Vial packet per NUS write.
      const sequence = this.nextSequence;
      this.nextSequence = (this.nextSequence + 1) & 0xffff;
      this.expectedSequences.push(sequence);
      const packet = new Uint8Array(BLE_FRAME_SIZE);
      packet[0] = sequence & 0xff;
      packet[1] = sequence >> 8;
      packet.set(msg, 2);
      console.log(
        `BLE NUS send: ${Array.from(packet)
          .map((value) => value.toString(16))
          .join(" ")}`,
      );
      if (this.txCharacteristic.properties.write) {
        await this.txCharacteristic.writeValue(packet);
      } else {
        await this.txCharacteristic.writeValueWithoutResponse(packet);
      }
    } catch (error) {
      console.error("Error writing to BLE NUS:", error);
      throw error;
    }
  }

  getName(): string {
    return this.device?.name || "";
  }
}

export { WebBtNus };

