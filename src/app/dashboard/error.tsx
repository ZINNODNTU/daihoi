"use client";
import {AdminErrorBoundary} from "@/components/admin-error-boundary";
export default function DashboardError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <AdminErrorBoundary error={error} reset={reset}/>;
}
