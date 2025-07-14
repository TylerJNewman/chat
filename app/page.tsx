import {Shadcn} from "@/components/shadcn/Shadcn";
import Assistant from "./assistant";

export default function Home() {
  return (
    <div className="h-screen">
      <Assistant>
        <Shadcn />
      </Assistant>
    </div>
  );
}
