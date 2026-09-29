import { SongStudio } from "@/components/SongStudio";
import { isAccessCodeRequired, isAudioEnabled } from "@/lib/server/env";

// Feature flags come from runtime environment variables, so render per request.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <SongStudio audioEnabled={isAudioEnabled()} accessCodeRequired={isAccessCodeRequired()} />;
}
