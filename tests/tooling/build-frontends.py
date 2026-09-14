"""Reproducible bounded Windows builds with matching source/entry hashes, no deployment."""
import hashlib,json,os,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[2]
node=root/'HBuilderX/plugins/node/node.exe';cli=root/'HBuilderX/plugins/uniapp-cli'
evidence=root/'.build/commerce-hardening-20260914';evidence.mkdir(parents=True,exist_ok=True)
def state(kind):return json.loads(subprocess.check_output([str(node),str(root/'help/release/source-state.cjs'),kind],cwd=root))
for kind in (sys.argv[1:] or ['admin','h5','app']):
    if kind not in ['admin','h5','app']:raise ValueError(kind)
    before=state(kind)
    env={key:value for key,value in os.environ.items()if not key.startswith(('UNI_','VUE_CLI_'))}
    env.update(NODE_ENV='production',NODE_OPTIONS='--openssl-legacy-provider --max-old-space-size=4096')
    if kind=='admin':
        output=root/'template/admin/dist';cwd=root/'template/admin'
        command=[str(node),'node_modules/@vue/cli-service/bin/vue-cli-service.js','build','--mode=production']
        entry=output/'index.html'
    else:
        output=root/'.build/storefront-hardening'/kind;cwd=cli
        env.update(UNI_PLATFORM='h5' if kind=='h5' else 'app-plus',UNI_INPUT_DIR=str(root/'template/uni-app'),UNI_OUTPUT_DIR=str(output),UNI_MINIMIZE='true')
        command=[str(node),str(cli/'bin/uniapp-cli.js')];entry=output/('index.html'if kind=='h5'else'app-service.js')
    with (evidence/(kind+'-build.log')).open('wb')as log:
        p=subprocess.run(command,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=600)
    if p.returncode or not entry.is_file():raise RuntimeError(kind+' production build failed; see log')
    after=state(kind)
    if before['sourceDigest']!=after['sourceDigest']:raise RuntimeError('Sources changed during '+kind+' build')
    receipt={**before,'kind':kind,'entrySha256':hashlib.sha256(entry.read_bytes()).hexdigest(),'output':str(output),'node':subprocess.check_output([str(node),'-p','process.version'],text=True).strip()}
    (evidence/('build-'+kind+'.json')).write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    print('BUILD PASS '+kind,flush=True)
