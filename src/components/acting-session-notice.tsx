import "server-only";
import {cookies} from "next/headers";
import {readActingSession} from "@/lib/impersonation";
import {ActingBanner} from "@/components/acting-banner";

/** Keep the support-session warning visible in the actual app, not merely
 * the old preview UI. No status polling or extra DB queries for other users. */
export async function ActingSessionNotice(){
 const session=readActingSession(await cookies());
 if(!session)return null;
 return <ActingBanner name={session.targetName}/>;
}
