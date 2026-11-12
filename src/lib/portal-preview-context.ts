import "server-only";
import {cache} from "react";

// Request-scoped only: set after the preview route has authenticated and
// authorized a super administrator and verified the target's congress membership.
// Never serialize this state, persist it in cookies or read it from a request header.
type PreviewIdentity={userId:string;congressId:string};
export const portalPreviewState=cache(():{current:PreviewIdentity|null}=>({current:null}));

export function setVerifiedPortalPreview(userId:string,congressId:string){
 const state=portalPreviewState();
 if(state.current)throw new Error("PORTAL_PREVIEW_ALREADY_SET");
 state.current={userId,congressId};
}

export function currentPortalPreview():Readonly<PreviewIdentity>|null{
 return portalPreviewState().current;
}
