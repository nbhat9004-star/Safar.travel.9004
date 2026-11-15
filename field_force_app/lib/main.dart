import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

const _configuredApiBase = String.fromEnvironment('SAFAR_API_BASE', defaultValue: 'https://safarcurated.com/api/');
final apiBase = _configuredApiBase.endsWith('/') ? _configuredApiBase : '$_configuredApiBase/';
void main() => runApp(const FieldForceApp());

class FieldForceApp extends StatelessWidget {
  const FieldForceApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'SafarCurated Field Force',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F6B50)), useMaterial3: true, scaffoldBackgroundColor: const Color(0xFFF5F7F6)),
    home: const EmployeeGate(),
  );
}

class EmployeeGate extends StatefulWidget {
  const EmployeeGate({super.key});
  @override
  State<EmployeeGate> createState() => _EmployeeGateState();
}
class _EmployeeGateState extends State<EmployeeGate> {
  String? token;
  Map<String,dynamic>? employee;
  void signedIn(String t, Map<String,dynamic> u) => setState(() { token=t; employee=u; });
  void signOut() => setState(() { token=null; employee=null; });
  @override
  Widget build(BuildContext context) => token == null
    ? EmployeeLogin(onSignedIn:signedIn)
    : EmployeeHome(token:token!, employee:employee!, onSignOut:signOut);
}

class EmployeeLogin extends StatefulWidget {
  final void Function(String,Map<String,dynamic>) onSignedIn;
  const EmployeeLogin({super.key,required this.onSignedIn});
  @override
  State<EmployeeLogin> createState()=>_EmployeeLoginState();
}
class _EmployeeLoginState extends State<EmployeeLogin> {
  final email=TextEditingController(), password=TextEditingController();
  final dio=Dio(BaseOptions(baseUrl:apiBase,connectTimeout:const Duration(seconds:20),receiveTimeout:const Duration(seconds:20)));
  bool busy=false, obscure=true;
  String? error;
  Future<void> login() async {
    setState(() { busy=true; error=null; });
    try {
      final r=await dio.post('auth/login',data:{'email':email.text.trim(),'password':password.text});
      final data=Map<String,dynamic>.from(r.data);
      final user=Map<String,dynamic>.from(data['user']??{});
      if(data['ok']!=true || user['role']!='employee' || user['employeeStatus']=='suspended') {
        throw Exception(user['role']!='employee'?'This app is for SafarCurated employees only.':'Employee access is suspended or unavailable.');
      }
      final t=(data['token']??'').toString();
      if(t.isEmpty) throw Exception('Authentication token was not returned.');
      widget.onSignedIn(t,user);
    } on DioException catch(e) {
      setState(()=>error=(e.response?.data is Map ? e.response?.data['error']?.toString() : null) ?? 'Unable to sign in. Check your connection and credentials.');
    } catch(e) { setState(()=>error=e.toString().replaceFirst('Exception: ','')); }
    finally { if(mounted)setState(()=>busy=false); }
  }
  @override
  void dispose(){email.dispose();password.dispose();super.dispose();}
  @override
  Widget build(BuildContext context)=>Scaffold(body:SafeArea(child:Center(child:SingleChildScrollView(padding:const EdgeInsets.all(24),child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:440),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    const Icon(Icons.explore_rounded,size:54,color:Color(0xFF0F6B50)),
    const SizedBox(height:14),
    const Text('SafarCurated',textAlign:TextAlign.center,style:TextStyle(fontSize:28,fontWeight:FontWeight.w800,color:Color(0xFF123B30))),
    const Text('GROUND FIELD FORCE',textAlign:TextAlign.center,style:TextStyle(fontSize:11,letterSpacing:2,fontWeight:FontWeight.w700,color:Color(0xFF0F6B50))),
    const SizedBox(height:36),
    const Text('Login as Employee',style:TextStyle(fontSize:24,fontWeight:FontWeight.bold)),
    const SizedBox(height:6),const Text('Use your SafarCurated employee account to continue.',style:TextStyle(color:Colors.black54)),
    const SizedBox(height:24),
    TextField(controller:email,keyboardType:TextInputType.emailAddress,decoration:const InputDecoration(labelText:'Work email',prefixIcon:Icon(Icons.email_outlined),border:OutlineInputBorder())),
    const SizedBox(height:14),
    TextField(controller:password,obscureText:obscure,decoration:InputDecoration(labelText:'Password',prefixIcon:const Icon(Icons.lock_outline),suffixIcon:IconButton(onPressed:()=>setState(()=>obscure=!obscure),icon:Icon(obscure?Icons.visibility:Icons.visibility_off)),border:const OutlineInputBorder()),onSubmitted:(_)=>login()),
    if(error!=null) Padding(padding:const EdgeInsets.only(top:14),child:Text(error!,style:const TextStyle(color:Colors.red))),
    const SizedBox(height:22),
    FilledButton(onPressed:busy?null:login,style:FilledButton.styleFrom(padding:const EdgeInsets.symmetric(vertical:16),backgroundColor:const Color(0xFF0F6B50)),child:busy?const SizedBox(height:20,width:20,child:CircularProgressIndicator(strokeWidth:2,color:Colors.white)):const Text('Login as Employee')),
    const SizedBox(height:16),const Text('Employee accounts are issued by SafarCurated Super Admin.',textAlign:TextAlign.center,style:TextStyle(fontSize:12,color:Colors.black54))
  ]))))));
}

class EmployeeHome extends StatefulWidget {
 final String token; final Map<String,dynamic> employee; final VoidCallback onSignOut;
 const EmployeeHome({super.key,required this.token,required this.employee,required this.onSignOut});
 @override State<EmployeeHome> createState()=>_EmployeeHomeState();
}
class _EmployeeHomeState extends State<EmployeeHome>{
 final host=TextEditingController(),phone=TextEditingController(),address=TextEditingController(),notes=TextEditingController();
 late final Dio dio;
 List<dynamic> visits=[]; bool loading=true,saving=false;
 @override void initState(){super.initState();dio=Dio(BaseOptions(baseUrl:apiBase,headers:{'Authorization':'Bearer ${widget.token}'},connectTimeout:const Duration(seconds:20)));load();}
 Future<void> load()async{try{final r=await dio.get('employee/visits');if(r.data['ok']==true)visits=List<dynamic>.from(r.data['visits']??[]);}catch(_){}if(mounted)setState(()=>loading=false);}
 Future<Position> position()async{
  if(!await Geolocator.isLocationServiceEnabled())throw Exception('Please enable device location.');
  var p=await Geolocator.checkPermission();
  if(p==LocationPermission.denied)p=await Geolocator.requestPermission();
  if(p==LocationPermission.denied||p==LocationPermission.deniedForever)throw Exception('Location permission is required to verify a field visit.');
  return Geolocator.getCurrentPosition(locationSettings:const LocationSettings(accuracy:LocationAccuracy.high,timeLimit:Duration(seconds:20)));
 }
 Future<void> submit()async{
  if(host.text.trim().length<2||phone.text.trim().isEmpty){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Enter host name and phone number.')));return;}
  setState(()=>saving=true);
  try{final p=await position();final r=await dio.post('employee/visits',data:{'hostName':host.text.trim(),'phone':phone.text.trim(),'address':address.text.trim(),'notes':notes.text.trim(),'latitude':p.latitude,'longitude':p.longitude});
   if(r.data['ok']!=true)throw Exception(r.data['error']??'Could not submit visit');
   host.clear();phone.clear();address.clear();notes.clear();await load();
   if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('GPS-verified onboarding visit submitted.')));
  }catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString().replaceFirst('Exception: ',''))));}
  finally{if(mounted)setState(()=>saving=false);}
 }
 @override void dispose(){host.dispose();phone.dispose();address.dispose();notes.dispose();super.dispose();}
 Widget field(TextEditingController c,String label,{TextInputType? type,int lines=1})=>Padding(padding:const EdgeInsets.only(bottom:12),child:TextField(controller:c,maxLines:lines,keyboardType:type,decoration:InputDecoration(labelText:label,border:const OutlineInputBorder(),filled:true,fillColor:Colors.white)));
 @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Field Force'),actions:[IconButton(onPressed:widget.onSignOut,tooltip:'Sign out',icon:const Icon(Icons.logout))]),body:RefreshIndicator(onRefresh:load,child:ListView(padding:const EdgeInsets.all(16),children:[
  Card(child:ListTile(leading:const CircleAvatar(child:Icon(Icons.badge_outlined)),title:Text(widget.employee['name']??'Employee'),subtitle:Text(widget.employee['territory']??'Ground onboarding team'),trailing:const Chip(label:Text('ACTIVE')))),
  const SizedBox(height:12),const Text('New host onboarding visit',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),
  const SizedBox(height:12),Card(child:Padding(padding:const EdgeInsets.all(16),child:Column(children:[
   field(host,'Host / business name'),field(phone,'Phone number',type:TextInputType.phone),field(address,'Location / address'),field(notes,'Visit notes',lines:3),
   SizedBox(width:double.infinity,child:FilledButton.icon(onPressed:saving?null:submit,icon:const Icon(Icons.my_location),label:Text(saving?'Submitting…':'Capture GPS & Submit Visit')))
  ]))),
  const SizedBox(height:20),Text('My recent visits (${visits.length})',style:const TextStyle(fontSize:18,fontWeight:FontWeight.bold)),
  if(loading)const Center(child:Padding(padding:EdgeInsets.all(20),child:CircularProgressIndicator())),
  if(!loading&&visits.isEmpty)const Padding(padding:EdgeInsets.all(20),child:Text('Your submitted visits will appear here.')),
  ...visits.map((v)=>Card(child:ListTile(leading:const Icon(Icons.location_on_outlined),title:Text(v['hostName']??'Host'),subtitle:Text('${v['phone']??''} · ${v['status']??'submitted'}'),trailing:const Icon(Icons.verified_outlined))))
 ])));
}
