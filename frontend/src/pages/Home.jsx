import LandingPage from './LandingPage';
import MobileHub from './MobileHub';
import { useIsPWA } from '../hooks/useIsPWA';

export default function Home() {
  const isPWA = useIsPWA();

  return isPWA ? <MobileHub /> : <LandingPage />;
}
