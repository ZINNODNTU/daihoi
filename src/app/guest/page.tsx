import {GuestAccessEntry} from "@/components/guest-access-entry";
import {loadAvailableGuestCongresses} from "@/lib/guest-congress-list";
export const dynamic="force-dynamic";
export default async function GuestPage(){
 const options=await loadAvailableGuestCongresses();
 return <GuestAccessEntry options={options}/>;
}
