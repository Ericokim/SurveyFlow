import { AppProviders } from "./app/providers";
import "./styles/theme.css";

/**
 * App Root
 * Delegates to AppProviders for all provider logic
 */
function App() {
  return <AppProviders />;
}

export default App;
