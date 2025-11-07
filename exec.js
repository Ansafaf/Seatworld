import {exec} from "child_process";

exec('node -v',(err,stdout,stderr)=>{
    if(err){
        console.log(err);
    }
    else{
        console.log("Node updated version is:",stdout.trim());
    }
})