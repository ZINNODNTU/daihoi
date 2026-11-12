import {requireCongressAbility} from "@/lib/congress-access";
export default async function BallotsGuard({children,params}:{
 children:React.ReactNode;params:Promise<{id:string}>;
}){
 const {id}=await params;
 await requireCongressAbility(id,"ballots.read");
 return children;
}
