use std::{
    collections::HashMap,
    ffi::CString,
    sync::{atomic::AtomicBool, Arc, Mutex},
};

use hidapi::{HidApi, HidDevice};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_log::{Target, TargetKind};
#[cfg(target_os = "windows")]
use windows::{
    Devices::Bluetooth::{BluetoothCacheMode, BluetoothLEDevice},
    Devices::Bluetooth::GenericAttributeProfile::GattCommunicationStatus,
    Devices::Enumeration::DeviceInformation,
    core::GUID,
    Storage::Streams::DataReader,
};

#[derive(Serialize, Deserialize)]
struct HidDeviceId {
    path: String,
    #[serde(rename = "reportId")]
    report_id: u8,
}

#[derive(Serialize, Deserialize)]
struct HidDeviceListItem {
    name: String,
    vid: u16,
    pid: u16,
    opened: bool,
    usage: [u16; 1],
    #[serde(rename = "usagePage")]
    usage_page: [u16; 1],
}

#[derive(Serialize, Deserialize, Clone)]
struct InputReport {
    path: String,
    data: Vec<u8>,
}

struct ActiveHidDevice {
    device: HidDevice,
    read_loop_running: Arc<AtomicBool>,
}

struct HidDeviceState {
    active: Mutex<HashMap<String, ActiveHidDevice>>,
    device_list: Mutex<Vec<String>>,
}

#[cfg(target_os = "windows")]
async fn read_cached_battery(device: BluetoothLEDevice) -> Result<Option<u8>, String> {
    println!("1111 battery-cache: start Windows BluetoothLEDevice");
    println!("2222 battery-cache: Windows BluetoothLEDevice created");

    let services = device
        .GetGattServicesAsync()
        .map_err(|error| format!("Windows cached GATT services error: {error:?}"))?
        .await
        .map_err(|error| format!("Windows cached GATT services error: {error:?}"))?;
    let services_status = services
        .Status()
        .map_err(|error| format!("Windows cached GATT status error: {error:?}"))?;
    let service_list: Vec<_> = services
        .Services()
        .map_err(|error| format!("Windows cached GATT services list error: {error:?}"))?
        .into_iter()
        .collect();
    println!(
        "battery-cache: services status={services_status:?}, count={}",
        service_list.len()
    );
    if services_status != GattCommunicationStatus::Success {
        return Ok(None);
    }

    for service in service_list {
        let service_uuid = service
            .Uuid()
            .map_err(|error| format!("Windows GATT UUID error: {error:?}"))?;
        println!("battery-cache: service uuid={service_uuid:?}");
        if service_uuid != GUID::from_u128(0x0000180f00001000800000805f9b34fb) {
            continue;
        }
        let characteristics = service
            .GetCharacteristicsAsync()
            .map_err(|error| format!("Windows cached GATT characteristics error: {error:?}"))?
            .await
            .map_err(|error| format!("Windows cached GATT characteristics error: {error:?}"))?;
        let characteristics_status = characteristics
            .Status()
            .map_err(|error| format!("Windows cached GATT status error: {error:?}"))?;
        let characteristic_list: Vec<_> = characteristics
            .Characteristics()
            .map_err(|error| format!("Windows cached GATT characteristics list error: {error:?}"))?
            .into_iter()
            .collect();
        println!(
            "battery-cache: characteristics status={characteristics_status:?}, count={}",
            characteristic_list.len()
        );
        if characteristics_status != GattCommunicationStatus::Success {
            return Ok(None);
        }
        for characteristic in characteristic_list {
            let characteristic_uuid = characteristic
                .Uuid()
                .map_err(|error| format!("Windows GATT UUID error: {error:?}"))?;
            let properties = characteristic
                .CharacteristicProperties()
                .map_err(|error| format!("Windows GATT characteristic properties error: {error:?}"))?;
            println!(
                "battery-cache: characteristic uuid={characteristic_uuid:?}, properties={properties:?}"
            );
            if characteristic_uuid != GUID::from_u128(0x00002a1900001000800000805f9b34fb) {
                continue;
            }
            let result = characteristic
                .ReadValueWithCacheModeAsync(BluetoothCacheMode::Cached)
                .map_err(|error| format!("Windows cached battery read error: {error:?}"))?
                .await
                .map_err(|error| format!("Windows cached battery read error: {error:?}"))?;
            let result_status = result
                .Status()
                .map_err(|error| format!("Windows cached battery status error: {error:?}"))?;
            println!("battery-cache: Battery Level cached read status={result_status:?}");
            if result_status != GattCommunicationStatus::Success {
                return Ok(None);
            }
            let buffer = result
                .Value()
                .map_err(|error| format!("Windows battery buffer error: {error:?}"))?;
            let reader = DataReader::FromBuffer(&buffer)
                .map_err(|error| format!("Windows battery buffer error: {error:?}"))?;
            let mut value = [0u8; 1];
            reader
                .ReadBytes(&mut value)
                .map_err(|error| format!("Windows battery value error: {error:?}"))?;
            println!("battery-cache: Battery Level raw value={value:?}");
            return Ok(Some(value[0]));
        }
    }

    Ok(None)
}

#[derive(Serialize)]
struct HidBatteryProbe {
    descriptor: Vec<u8>,
    feature_reports: Vec<Vec<u8>>,
}

#[tauri::command]
fn hid_battery_probe(
    device: String,
    state: tauri::State<'_, HidDeviceState>,
) -> Result<HidBatteryProbe, String> {
    let active = state.active.lock().unwrap();
    let hid = active
        .get(&device)
        .ok_or_else(|| format!("HID device is not open: {device}"))?;

    let mut descriptor = vec![0u8; hidapi::MAX_REPORT_DESCRIPTOR_SIZE];
    let descriptor_size = hid
        .device
        .get_report_descriptor(&mut descriptor)
        .map_err(|error| format!("HID report descriptor error: {error:?}"))?;
    descriptor.truncate(descriptor_size);
    println!("battery: HID report descriptor ({descriptor_size} bytes) {descriptor:?}");

    let mut report_ids = vec![0u8];
    for window in descriptor.windows(2) {
        if window[0] == 0x85 && !report_ids.contains(&window[1]) {
            report_ids.push(window[1]);
        }
    }

    let mut feature_reports = Vec::new();
    for report_id in report_ids {
        let mut report = vec![0u8; 65];
        report[0] = report_id;
        if let Ok(size) = hid.device.get_feature_report(&mut report) {
            report.truncate(size);
            println!("battery: HID feature report id={report_id} {report:?}");
            feature_reports.push(report);
        }
    }

    Ok(HidBatteryProbe {
        descriptor,
        feature_reports,
    })
}

#[tauri::command]
async fn battery_get_level(device_name: String) -> Result<Option<u8>, String> {
    let requested_name = device_name.trim().to_ascii_lowercase();
    println!("battery: enumerating Windows Bluetooth LE devices for {:?}", device_name);
    let selector = BluetoothLEDevice::GetDeviceSelector()
        .map_err(|error| format!("Windows Bluetooth selector error: {error:?}"))?;
    let devices = DeviceInformation::FindAllAsyncAqsFilter(&selector)
        .map_err(|error| format!("Windows Bluetooth device enumeration error: {error:?}"))?
        .await
        .map_err(|error| format!("Windows Bluetooth device enumeration error: {error:?}"))?;

    for index in 0..devices.Size().map_err(|error| format!("Windows device list error: {error:?}"))? {
        let info = devices
            .GetAt(index)
            .map_err(|error| format!("Windows device info error: {error:?}"))?;
        let name = info.Name().map(|value| value.to_string()).unwrap_or_default();
        let id = info.Id().map(|value| value.to_string()).unwrap_or_default();
        println!("battery: Windows BLE device index={index}, name={name:?}, id={id:?}");
        let name_lower = name.to_ascii_lowercase();
        if !requested_name.is_empty()
            && name_lower != requested_name
            && !name_lower.contains(&requested_name)
        {
            continue;
        }
        let device_id = info
            .Id()
            .map_err(|error| format!("Windows device ID error: {error:?}"))?;
        let device = BluetoothLEDevice::FromIdAsync(&device_id)
            .map_err(|error| format!("Windows Bluetooth device error: {error:?}"))?
            .await
            .map_err(|error| format!("Windows Bluetooth device error: {error:?}"))?;
        return read_cached_battery(device).await;
    }

    println!("battery: no matching Windows Bluetooth LE device found");
    Ok(None)
}

fn new_hidapi() -> HidApi {
    HidApi::new().expect("Failed to create `HidApi`")
}

fn get_report_id(hid: &HidDevice) -> u8 {
    let mut desc = [0u8; hidapi::MAX_REPORT_DESCRIPTOR_SIZE];
    let size = hid.get_report_descriptor(&mut desc).unwrap_or(0);

    let mut idx = 0;
    while idx < size {
        let item = desc[idx];
        if item == 0x85 {
            return *desc.get(idx + 1).unwrap_or(&0);
        }

        idx = match item & 0x03 {
            0 => idx + 1,
            1 => idx + 2,
            2 => idx + 3,
            3 => idx + 4,
            _ => idx + 1,
        };
    }

    return 0;
}

#[tauri::command]
fn hid_get_devices(state: tauri::State<'_, HidDeviceState>) -> Vec<HidDeviceListItem> {
    println!("get_devices()");
    let hidapi = new_hidapi();
    let devs: Vec<_> = hidapi.device_list().collect();
    for device in &devs {
        println!(
            "HID device: name={:?}, path={:?}, usage_page=0x{:04x}, usage=0x{:04x}",
            device.product_string(),
            device.path(),
            device.usage_page(),
            device.usage()
        );
    }
    let list = devs
        .iter()
        .map(|d| HidDeviceListItem {
            name: d.product_string().unwrap_or("").to_string(),
            vid: d.vendor_id(),
            pid: d.product_id(),
            opened: state
                .active
                .lock()
                .unwrap()
                .contains_key(&d.path().to_str().unwrap_or("").to_string()),
            usage: [d.usage()],
            usage_page: [d.usage_page()],
        })
        .collect();
    state.device_list.lock().unwrap().clear();

    let mut paths: Vec<String> = devs
        .iter()
        .map(|d| d.path().to_str().unwrap_or("").to_string())
        .collect();
    state.device_list.lock().unwrap().append(&mut paths);
    list
}

#[tauri::command]
fn hid_open_device(
    device_index: usize,
    app: AppHandle,
    state: tauri::State<'_, HidDeviceState>,
) -> Result<HidDeviceId, String> {
    let hidapi = new_hidapi();
    let path = CString::new(
        state
            .device_list
            .lock()
            .unwrap()
            .get(device_index)
            .unwrap()
            .as_str(),
    )
    .unwrap();

    if let Some((path, active_hid)) = state
        .active
        .lock()
        .unwrap()
        .get_key_value(&path.to_str().unwrap().to_string())
    {
        if active_hid
            .read_loop_running
            .load(std::sync::atomic::Ordering::SeqCst)
        {
            println!("{} is already opened", path);
            let report_id = get_report_id(&active_hid.device);
            return Ok(HidDeviceId {
                path: path.clone(),
                report_id: report_id,
            });
        }
    }

    println!("Open {:?}", path);

    let path2 = path.clone();
    let hidres = hidapi.open_path(path.as_c_str());

    match hidres {
        Err(e) => Err(format!("{:?}", e)),
        Ok(dev) => {
            let report_id = get_report_id(&dev);
            state.active.lock().unwrap().insert(
                path.to_str().unwrap().to_string(),
                ActiveHidDevice {
                    device: dev,
                    read_loop_running: Arc::new(AtomicBool::new(true)),
                },
            );

            let flag_cloned = if let Some((_, active_hid)) = state
                .active
                .lock()
                .unwrap()
                .get_key_value(&path.to_str().unwrap().to_string())
            {
                active_hid
                    .read_loop_running
                    .store(true, std::sync::atomic::Ordering::SeqCst);
                Some(active_hid.read_loop_running.clone())
            } else {
                None
            };

            std::thread::spawn(move || {
                let hidres = hidapi.open_path(path.as_c_str());
                if let Ok(dev) = hidres {
                    println!("start read loop");
                    let flag = flag_cloned.unwrap();
                    loop {
                        let mut buf = [0u8; 65];
                        let res = dev.read(&mut buf).and_then(|d| {
                            // println!("report received");
                            app.emit(
                                "oninputreport",
                                InputReport {
                                    path: path.to_str().unwrap().to_string(),
                                    data: buf[0..d].into(),
                                },
                            )
                            .unwrap();
                            Ok(())
                        });

                        if let Err(e) = res {
                            flag.store(false, std::sync::atomic::Ordering::SeqCst);
                            println!("{:?}", e);
                        };

                        if !flag.load(std::sync::atomic::Ordering::SeqCst) {
                            let _ = app.emit(
                                "onclose",
                                InputReport {
                                    path: path.to_str().unwrap().to_string(),
                                    data: [].into(),
                                },
                            );
                            return;
                        }
                    }
                }
            });
            Ok(HidDeviceId {
                path: path2.to_str().unwrap().to_string(),
                report_id: report_id,
            })
        }
    }
}

#[tauri::command]
fn hid_write(
    device: String,
    data: Vec<u8>,
    state: tauri::State<'_, HidDeviceState>,
) -> Result<(), String> {
    match state
        .active
        .lock()
        .unwrap()
        .get(&device)
        .unwrap()
        .device
        .write(&data)
    {
        Err(e) => {
            println!("fail");
            Err(format!("{:?}", e))
        }
        Ok(_s) => Ok(()),
    }
}

#[tauri::command]
fn hid_read(
    device: HidDeviceId,
    state: tauri::State<'_, HidDeviceState>,
) -> Result<Vec<u8>, String> {
    let mut buf = [0u8; 65];
    match state
        .active
        .lock()
        .unwrap()
        .get(&device.path)
        .unwrap()
        .device
        .read(&mut buf)
    {
        Err(e) => Err(format!("{:?}", e)),
        Ok(size) => Ok(buf[0..size].into()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .manage(HidDeviceState {
            active: Mutex::new(HashMap::new()),
            device_list: Mutex::new(Vec::<String>::new()),
        })
        .invoke_handler(tauri::generate_handler![
            hid_get_devices,
            hid_open_device,
            hid_write,
            hid_read,
            hid_battery_probe,
            battery_get_level
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
