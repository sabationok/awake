import AudioToolbox
import CoreAudio
import Foundation

/// Гучність і вимкнення звуку на поточному виході (динаміки, навушники). Root і дозволи не потрібні.
/// Деякі виходи (HDMI, частина USB) гучність не дають: тоді `volume()` повертає nil.
enum SoundService {
    /// Гучність 0…100 або nil, якщо вихід її не має.
    static func volume() -> Int? {
        guard let device = defaultOutput() else { return nil }
        var value = Float32(0)
        guard get(device, volumeAddress, &value) else { return nil }
        return Int((value * 100).rounded())
    }

    @discardableResult
    static func setVolume(_ percent: Int) -> Bool {
        guard let device = defaultOutput() else { return false }
        var value = Float32(min(max(percent, 0), 100)) / 100
        let changed = set(device, volumeAddress, &value)
        // Рух повзунка вгору сам по собі має повертати звук, як клавіші гучності.
        if changed, percent > 0, isMuted() == true { setMuted(false) }
        return changed
    }

    static func isMuted() -> Bool? {
        guard let device = defaultOutput() else { return nil }
        var value = UInt32(0)
        guard get(device, muteAddress, &value) else { return nil }
        return value != 0
    }

    @discardableResult
    static func setMuted(_ muted: Bool) -> Bool {
        guard let device = defaultOutput() else { return false }
        var value = UInt32(muted ? 1 : 0)
        return set(device, muteAddress, &value)
    }

    // MARK: CoreAudio

    private static var volumeAddress = AudioObjectPropertyAddress(
        mSelector: kAudioHardwareServiceDeviceProperty_VirtualMainVolume,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: kAudioObjectPropertyElementMain)

    private static var muteAddress = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyMute,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: kAudioObjectPropertyElementMain)

    private static func defaultOutput() -> AudioObjectID? {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultOutputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain)
        var device = AudioObjectID(kAudioObjectUnknown)
        var size = UInt32(MemoryLayout<AudioObjectID>.size)
        let status = AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &device)
        return status == noErr && device != kAudioObjectUnknown ? device : nil
    }

    private static func get<T: BitwiseCopyable>(_ device: AudioObjectID, _ address: AudioObjectPropertyAddress, _ value: inout T) -> Bool {
        var address = address
        guard AudioObjectHasProperty(device, &address) else { return false }
        var size = UInt32(MemoryLayout<T>.size)
        return AudioObjectGetPropertyData(device, &address, 0, nil, &size, &value) == noErr
    }

    private static func set<T: BitwiseCopyable>(_ device: AudioObjectID, _ address: AudioObjectPropertyAddress, _ value: inout T) -> Bool {
        var address = address
        var settable: DarwinBoolean = false
        guard AudioObjectHasProperty(device, &address),
              AudioObjectIsPropertySettable(device, &address, &settable) == noErr, settable.boolValue else { return false }
        return AudioObjectSetPropertyData(device, &address, 0, nil, UInt32(MemoryLayout<T>.size), &value) == noErr
    }
}
