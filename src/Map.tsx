import {
  GoogleMap,
  useLoadScript,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useMemo, useState } from "react";

const Map = () => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  // 出発地
  const origin = useMemo(() => ({ lat: 34.7411061, lng: 135.6588796 }), []);

  // 複数の購買候補
  const stores = [
    { lat: 34.742442, lng: 135.659056, name: "ダイドー" },
    { lat: 34.74311443, lng: 135.6592243, name: "生協コンビニ" },
    { lat: 34.7436948, lng: 135.6595555, name: "キャンパス購買2" },
  ];

  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [info, setInfo] = useState<string>("");

  // 最寄りの購買を検索する関数
  const handleFindNearest = () => {
    if (!google || !google.maps) return;
    const directionsService = new google.maps.DirectionsService();

    let nearest: {
      store: (typeof stores)[0];
      result: google.maps.DirectionsResult;
    } | null = null;
    let pending = stores.length;

    stores.forEach((store) => {
      directionsService.route(
        {
          origin,
          destination: store,
          travelMode: google.maps.TravelMode.WALKING,
        },
        (result, status) => {
          pending--;

          if (status === "OK" && result) {
            const leg = result.routes[0].legs[0];
            const distanceValue = leg.distance?.value ?? Infinity; // m単位

            if (
              !nearest ||
              distanceValue <
                (nearest.result.routes[0].legs[0].distance?.value ?? Infinity)
            ) {
              nearest = { store, result };
            }
          }

          // 全部計算終わったら最寄りを表示
          if (pending === 0 && nearest) {
            setDirections(nearest.result);
            const leg = nearest.result.routes[0].legs[0];
            setInfo(
              `最寄り: ${nearest.store.name} / 距離: ${leg.distance?.text}, 時間: ${leg.duration?.text}`
            );
          }
        }
      );
    });
  };

  if (!isLoaded) return <div>地図を読み込み中...</div>;

  return (
    <div>
      <button onClick={handleFindNearest}>最寄りの購買を探す</button>
      <p>{info}</p>
      <GoogleMap
        zoom={15}
        center={origin}
        mapContainerStyle={{ width: "100%", height: "500px" }}
      >
        <Marker position={origin} label="出発地" />
        {stores.map((store, i) => (
          <Marker key={i} position={store} label={store.name} />
        ))}
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </div>
  );
};

export default Map;
