const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=function loadSafety(ctx,window){
 ctx.TextEncoder=TextEncoder;if(!ctx.crypto?.subtle)Object.defineProperty(ctx,'crypto',{value:require('node:crypto').webcrypto,configurable:true});
 if(!vm.isContext(ctx))vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../safe-actions.js'),'utf8'),ctx,{filename:'safe-actions.js'});
};
