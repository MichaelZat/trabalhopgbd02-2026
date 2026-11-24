import 'dotenv/config';
import { spawnSync,spawn } from 'node:child_process';
if(!process.env.DATABASE_URL && process.env.DB_CREDENTIALS){
  const c=JSON.parse(process.env.DB_CREDENTIALS);
  if(!process.env.DB_HOST)throw new Error('DB_HOST não configurado.');
  process.env.DATABASE_URL=`postgresql://${encodeURIComponent(c.username)}:${encodeURIComponent(c.password)}@${process.env.DB_HOST}:5432/${process.env.DB_NAME || 'bilheteria'}?sslmode=require&connection_limit=5`;
}
delete process.env.DB_CREDENTIALS;
const migration=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{stdio:'inherit',env:process.env});
if(migration.status!==0)process.exit(migration.status??1);
const bootstrap=spawnSync(process.execPath,['dist/bootstrap-operator.js'],{stdio:'inherit',env:process.env});
if(bootstrap.status!==0)process.exit(bootstrap.status??1);
delete process.env.BOOTSTRAP_OPERATOR_CREDENTIALS;
const server=spawn(process.execPath,['dist/server.js'],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));
server.on('exit',code=>process.exit(code??1));
