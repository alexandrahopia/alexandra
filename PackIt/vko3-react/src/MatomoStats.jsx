import { useEffect, useState } from "react";
import axios from "axios";

function MatomoStats() {
  const [visits, setVisits] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = "b2590b40f31ec26be98927ac7e483ac8";

    const url =
      "https://pilvipalvelut-matomo.2.rahtiapp.fi/index.php" +
      "?module=API" +
      "&method=VisitsSummary.getVisits" +
      "&idSite=1" +
      "&period=day" +
      "&date=last30" +
      "&format=JSON" +
      `&token_auth=${token}`;

    const fetchData = async () => {
      try {
        const response = await axios.get(url);
        setVisits(response.data.value);
      } catch (err) {
        console.error(err);
        setError("Virhe Matomo API -haussa");
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2>Matomo – viimeiset 30 päivää</h2>
      {error && <p>{error}</p>}
      {visits === null && !error && <p>Ladataan…</p>}
      {visits !== null && <p>Käynnit yhteensä: {visits}</p>}
    </div>
  );
}

export default MatomoStats;

