import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getCollection } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
const json=(data,status=200)=>NextResponse.json(data,{status});
async function activeEmployee(request){const me=await getCurrentUser(request);return me&&me.role==='employee'&&me.employeeStatus!=='suspended'?me:null;}
export async function GET(request){
 const me=await activeEmployee(request);if(!me)return json({ok:false,error:'Active employee login required.'},401);
 const rows=await (await getCollection('hostOnboardingApplications')).find({employeeId:me.id},{projection:{_id:0}}).sort({createdAt:-1}).limit(100).toArray();
 return json({ok:true,applications:rows});
}
export async function POST(request){
 const me=await activeEmployee(request);if(!me)return json({ok:false,error:'Active employee login required.'},401);
 const b=await request.json().catch(()=>({}));
 const hostName=String(b.hostName||'').trim(),businessName=String(b.businessName||'').trim(),email=String(b.email||'').trim().toLowerCase(),phone=String(b.phone||'').trim(),businessType=String(b.businessType||'stay').trim(),address=String(b.address||'').trim(),description=String(b.description||'').trim(),notes=String(b.notes||'').trim();
 const latitude=Number(b.latitude),longitude=Number(b.longitude);
 if(hostName.length<2||businessName.length<2||phone.length<7||address.length<4||!['stay','transport','experience','tour'].includes(businessType)||!b.consentAccepted||!Number.isFinite(latitude)||!Number.isFinite(longitude))return json({ok:false,error:'Complete host name, business name, phone, address, category, GPS and host consent.'},400);
 const doc={id:uuid(),employeeId:me.id,employeeName:me.name,managerId:me.managerId||null,hostName,businessName,email,phone,businessType,address,description,notes,latitude,longitude,consentAccepted:true,consentAt:new Date(),status:'pending',createdAt:new Date(),updatedAt:new Date()};
 await (await getCollection('hostOnboardingApplications')).insertOne(doc);
 return json({ok:true,application:doc},201);
}
