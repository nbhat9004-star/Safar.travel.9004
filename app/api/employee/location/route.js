import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getCollection } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
const json=(data,status=200)=>NextResponse.json(data,{status});
export async function POST(request){
 const me=await getCurrentUser(request);if(!me||me.role!=='employee'||me.employeeStatus==='suspended')return json({ok:false,error:'Active employee login required.'},401);
 const b=await request.json().catch(()=>({}));
 const latest=await getCollection('employeeLocationLatest');
 if(b.sharingEnabled===false){await latest.updateOne({employeeId:me.id},{$set:{sharingEnabled:false,updatedAt:new Date()}});return json({ok:true,sharingEnabled:false});}
 const latitude=Number(b.latitude),longitude=Number(b.longitude);
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -90||latitude>90||longitude < -180||longitude>180)return json({ok:false,error:'Valid GPS coordinates required.'},400);
 const now=new Date();const row={id:uuid(),employeeId:me.id,employeeName:me.name,managerId:me.managerId||null,latitude,longitude,accuracy:Number(b.accuracy)||null,sharingEnabled:b.sharingEnabled===true,recordedAt:now};
 await (await getCollection('employeeLocationPings')).insertOne(row);
 await latest.updateOne({employeeId:me.id},{$set:{...row,updatedAt:now}},{upsert:true});
 return json({ok:true,recordedAt:now});
}
