import sys

path = r'src\app\teacher\live\[id]\studio\StudioInterface.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find start of the broken toggleVideo block and end marker
start_marker = '  const toggleVideo = async () => {'
end_marker = '  const { send: sendQuiz } = useDataChannel'

idx = content.find(start_marker)
end_idx = content.find(end_marker)

if idx == -1 or end_idx == -1:
    print(f'MARKERS NOT FOUND: idx={idx} end_idx={end_idx}')
    sys.exit(1)

good_block = (
    '  const toggleVideo = async () => {\n'
    '    if (!localParticipant) return\n'
    '    try {\n'
    '      if (!isCameraEnabled) {\n'
    '        await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => null)\n'
    '      }\n'
    '      await localParticipant.setCameraEnabled(!isCameraEnabled)\n'
    "      toast(!isCameraEnabled ? 'Camera active' : 'Camera off')\n"
    '    } catch (error: any) {\n'
    "      console.error('[StudioControls] Camera error:', error)\n"
    '      if (error?.name === "NotAllowedError" || error?.message?.includes("Permission")) {\n'
    '        toast.error("Camera blocked. Click the lock icon in your address bar -> Allow Camera -> Refresh.", { duration: 6000 })\n'
    '      } else {\n'
    '        toast.error("Camera unavailable. Is another app using it?")\n'
    '      }\n'
    '    }\n'
    '  }\n'
    '\n'
    '  const toggleScreen = async () => {\n'
    '    if (!localParticipant) return\n'
    '    try {\n'
    '      const newState = !isScreenShareEnabled\n'
    '      await localParticipant.setScreenShareEnabled(newState, { audio: false })\n'
    "      toast(newState ? 'Sharing screen' : 'Sharing stopped')\n"
    '    } catch (e: any) {\n'
    '      toast.error("Screen share failed. Check browser permissions.", { id: "screen-error" })\n'
    "      console.error('Screen share error:', e)\n"
    '    }\n'
    '  }\n'
)

new_content = content[:idx] + good_block + '\n' + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'FIXED OK — file length: {len(new_content)} chars')
