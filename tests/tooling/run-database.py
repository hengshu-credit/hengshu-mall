"""Start a private MySQL instance for database + real HTTP suites; never attach to a mall DB."""
import os,pathlib,socket,subprocess,time,uuid,json
root=pathlib.Path(__file__).resolve().parents[2]
base=pathlib.Path(os.environ.get('CRMEB_MYSQL_BASE',str(root/'.build/commerce-hardening-20260914/mysql-8.0.45-winx64'))).resolve()
mysqld=base/'bin/mysqld.exe';mysql=base/'bin/mysql.exe'
if not mysqld.is_file():raise RuntimeError('Provide CRMEB_MYSQL_BASE for a MySQL 8.0 Windows noinstall runtime')
work=root/'.build'/('commerce-db-'+uuid.uuid4().hex[:10]);work.mkdir(parents=True)
assert work.resolve().is_relative_to((root/'.build').resolve())
with socket.socket()as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
env=dict(os.environ,CRMEB_AUDIT_DATABASE='crmeb_hardening_test',CRMEB_AUDIT_PORT=str(port),CRMEB_QUALITY_DATABASE='crmeb_quality_test',CRMEB_QUALITY_PORT=str(port),PYTHONIOENCODING='utf-8')
env.setdefault('PHP_BINARY',str(root/'.build/php74/php.exe'))
env.setdefault('PHPRC',str(root/'.build/commerce-hardening-20260914/php-audit.ini'))
env.setdefault('OPENSSL_CONF',str(root/'.build/php74/extras/ssl/openssl.cnf'))
node=root/'HBuilderX/plugins/node/node.exe'
with (work/'mysql.log').open('wb')as log:
    subprocess.run([str(mysqld),'--no-defaults','--initialize-insecure','--basedir='+str(base),'--datadir='+str(work/'data'),'--console'],stdout=log,stderr=subprocess.STDOUT,check=True,timeout=40)
    server=subprocess.Popen([str(mysqld),'--no-defaults','--basedir='+str(base),'--datadir='+str(work/'data'),'--bind-address=127.0.0.1','--port='+str(port),'--mysqlx=0','--skip-log-bin','--console'],stdout=log,stderr=subprocess.STDOUT)
    try:
        deadline=time.monotonic()+30
        while True:
            if server.poll() is not None:raise RuntimeError('MySQL startup failed; see '+str(work/'mysql.log'))
            try:
                with socket.create_connection(('127.0.0.1',port),timeout=.2):break
            except OSError:
                if time.monotonic()>deadline:raise RuntimeError('MySQL startup timeout')
                time.sleep(.1)
        sql="CREATE DATABASE crmeb_audit; CREATE DATABASE crmeb_hardening_test; CREATE DATABASE crmeb_quality_test; ALTER USER 'root'@'localhost' IDENTIFIED BY 'audit-only-password';"
        subprocess.run([str(mysql),'--no-defaults','--host=127.0.0.1','--port='+str(port),'--user=root','--execute='+sql],check=True,timeout=10)
        codes=[]
        for group in ['database','http']:
            p=subprocess.run([str(node),str(root/'tests/regression/run-all.cjs'),group],env=env,cwd=root,timeout=180)
            codes.append(p.returncode)
        print(json.dumps({'work':str(work),'port':port,'exit_codes':codes}))
        raise SystemExit(1 if any(codes) else 0)
    finally:
        server.terminate();server.wait(timeout=15)
