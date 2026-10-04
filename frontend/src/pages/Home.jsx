import LandingPage from './LandingPage';
import MobileHub from './MobileHub';
import { useIsAppMode } from '../hooks/useIsPWA';

export default function Home() {
  const isAppMode = useIsAppMode();

  return isAppMode ? <MobileHub /> : <LandingPage />;
}
