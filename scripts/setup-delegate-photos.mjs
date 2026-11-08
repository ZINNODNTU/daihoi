#!/usr/bin/env node
/** Create a private portrait bucket in the verified Supabase project. */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const project="https://pnxdxdagpeyqarucdphk.supabase.co";
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==project)throw new Error("Wrong Supabase project.");
const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!secret)throw new Error("Missing server Secret Key.");
const admin=createClient(project,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket="delegate-photos";
const {data:existing,error:lookupError}=await admin.storage.getBucket(bucket);
if(existing){
 if(existing.public)throw new Error("Delegate photo bucket must be private.");
 console.log("[OK] Private delegate-photos bucket already exists.");
}else if(lookupError?.status===404||lookupError?.statusCode==="404"){
 const {error}=await admin.storage.createBucket(bucket,{
  public:false,fileSizeLimit:2097152,allowedMimeTypes:["image/jpeg"]
 });
 if(error)throw error;
 console.log("[OK] Created private delegate-photos bucket; JPEG up to 2 MB.");
}else throw lookupError||new Error("Cannot verify bucket.");
