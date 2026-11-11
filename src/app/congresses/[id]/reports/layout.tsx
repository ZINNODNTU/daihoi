import {requireCongressAbility} from "@/lib/congress-access";
export default async function CongressSectionGuard({children,params}:{
 children:React.ReactNode;
 params:Promise<{id:string}>;
}){
 const {id}=await params;
 await requireCongressAbility(id,"reports.read");
 return children;
}
