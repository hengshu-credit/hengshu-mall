"""Own a bounded Android emulator lifecycle for the required native UI gate."""
import os,pathlib,subprocess,time
root=pathlib.Path(__file__).resolve().parents[2];sdk=root/'help/dev/.state/android-tools';adb=sdk/'platform-tools/adb.exe'
out=root/'.build/commerce-hardening-20260914';env=dict(os.environ,ANDROID_SDK_ROOT=str(sdk),ANDROID_AVD_HOME=str(root/'help/dev/.state/android-avd'))
def command(*args):return subprocess.run([str(adb),'-s','emulator-5554',*args],capture_output=True,timeout=15)
devices=subprocess.check_output([str(adb),'devices'],timeout=10).decode();emulator=None
with (out/'emulator-gate.log').open('wb')as log:
    try:
        if 'emulator-5554\tdevice' not in devices:
            emulator=subprocess.Popen([str(sdk/'emulator/emulator.exe'),'-avd','Wuse_API_30','-port','5554','-no-window','-no-audio','-no-snapshot-save','-gpu','swiftshader_indirect'],env=env,stdout=log,stderr=subprocess.STDOUT)
        deadline=time.monotonic()+150
        while command('shell','getprop','sys.boot_completed').stdout.strip()!=b'1':
            if emulator and emulator.poll() is not None:raise RuntimeError('Emulator exited; see emulator-gate.log')
            if time.monotonic()>deadline:raise RuntimeError('Android boot timeout')
            time.sleep(1)
        if command('shell','getprop','ro.kernel.qemu').stdout.strip()!=b'1':raise RuntimeError('Native gate requires the isolated emulator')
        command('root');command('wait-for-device')
        node=root/'HBuilderX/plugins/node/node.exe'
        result=subprocess.run([str(node),str(root/'tests/regression/run-all.cjs'),'native'],cwd=root,env=env,timeout=330)
        raise SystemExit(result.returncode)
    finally:
        if emulator:
            command('emu','kill')
            try:emulator.wait(timeout=15)
            except subprocess.TimeoutExpired:emulator.terminate()
