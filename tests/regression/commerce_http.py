"""Real loopback HTTP authorization tests. Requires isolated MySQL and PHP_BINARY/PHPRC."""
import json, os, pathlib, socket, subprocess, tempfile, time, urllib.request, urllib.error
root=pathlib.Path(__file__).resolve().parents[2]
php=os.environ.get('PHP_BINARY',str(root/'.build/php74/php.exe'))
env=dict(os.environ)
assert env.get('CRMEB_AUDIT_DATABASE')=='crmeb_hardening_test'
tokens=json.loads(subprocess.check_output([php,str(root/'tests/regression/commerce_http.php'),'seed'],env=env,cwd=root))
with socket.socket() as sock:
    sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
with tempfile.TemporaryFile() as log:
    server=subprocess.Popen([php,'-S',f'127.0.0.1:{port}',str(root/'tests/regression/commerce_http.php')],cwd=root,env=env,stdout=log,stderr=log)
    try:
        deadline=time.monotonic()+10
        while True:
            try:
                with socket.create_connection(('127.0.0.1',port),timeout=.2):break
            except OSError:
                if time.monotonic()>deadline:raise RuntimeError('HTTP fixture server unavailable')
                time.sleep(.05)
        def check(path,identity,expected,method='GET'):
            headers={'Accept':'application/json'}
            if identity is not None:headers['Authori-zation']='Bearer '+tokens[str(identity)]
            req=urllib.request.Request(f'http://127.0.0.1:{port}/'+path,headers=headers,method=method)
            try:
                with urllib.request.urlopen(req,timeout=10) as res:status=res.status;body=res.read().decode()
            except urllib.error.HTTPError as res:status=res.code;body=res.read().decode()
            actual=json.loads(body).get('status',status)
            assert actual==expected,(identity,method,path,status,body)
            print(f'PASS: HTTP {method} {path}, identity={identity}, HTTP={status}, business={actual}')
        for path in ['finance/recharge','order/list','user/user']:
            check(path,None,401);check(path,1,400);check(path,2,200);check(path,3,400);check(path,4,200);check(path,'consumer',401)
        check('finance/recharge/1',2,400,'PUT');check('finance/recharge/1',3,200,'PUT')
        check('crud/unregistered',1,400);check('crud/unregistered',2,400)
        check('not-a-route',4,404)
        print('HTTP authorization matrix passed.')
    finally:
        server.terminate();server.wait(timeout=10)
        log.seek(0)
        (root/'.build/commerce-hardening-20260914/http-test.log').write_bytes(log.read())
