import LoginForm from "./LoginForm";
import MatomoStats from "./MatomoStats";
import "./App.css";

function App() {
  return (
    <div className="app-root">
      <h1 className="app-title">Viikko 6 – Matomo API</h1>

      <h2>Firebase Login (viikko 4)</h2>
      <LoginForm />

      <hr />

      <MatomoStats />
    </div>
  );
}

export default App;






