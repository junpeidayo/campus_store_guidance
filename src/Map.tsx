import {
  GoogleMap,
  useLoadScript,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useMemo, useState } from "react";

type Store = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "vending" | "shop" | "drink";
};

const containerStyle = { width: "100%", height: "500px" };

const iconMap: Record<Store["type"], string> = {
  vending: "/icons/vending.png",
  shop: "/icons/shop.svg",
  drink: "/icons/drink.svg",
};

export default function Map() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const origin = useMemo(() => ({ lat: 34.7411061, lng: 135.6588796 }), []);

  const [stores] = useState<Store[]>([
    {
      id: "1",
      name: "ダイドー",
      lat: 34.742442,
      lng: 135.659056,
      type: "drink",
    },
    {
      id: "2",
      name: "生協コンビニ",
      lat: 34.74311443,
      lng: 135.6592243,
      type: "shop",
    },
    {
      id: "3",
      name: "キャンパス購買2",
      lat: 34.7436948,
      lng: 135.6595555,
      type: "drink",
    },
    { id: "4", name: "給水スポット", lat: 34.704, lng: 135.494, type: "drink" },
  ]);

  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);
  const [info, setInfo] = useState("");

  const handleFindNearest = () => {
    if (!google || !google.maps) return;
    const directionsService = new google.maps.DirectionsService();

    let nearestDistance = Infinity;

    stores.forEach((store) => {
      const request: google.maps.DirectionsRequest = {
        origin,
        destination: { lat: store.lat, lng: store.lng },
        travelMode: google.maps.TravelMode.WALKING,
      };

      directionsService.route(request, (result, status) => {
        if (status === "OK" && result) {
          const distanceValue =
            result.routes[0].legs[0].distance?.value ?? Infinity;
          if (distanceValue < nearestDistance) {
            nearestDistance = distanceValue;
            setDirectionsResponse(result);
            const leg = result.routes[0].legs[0];
            setInfo(
              `最寄り: ${store.name} / 距離: ${leg.distance?.text}, 時間: ${leg.duration?.text}`
            );
          }
        }
      });
    });
  };

  if (!isLoaded) return <div>地図を読み込み中...</div>;

  return (
    <div>
      <GoogleMap mapContainerStyle={containerStyle} center={origin} zoom={16}>
        {/* 出発地点 */}
        <Marker position={origin} label="出発地" />

        {/* 各ストアのピン */}
        {stores.map((store) => {
          const icon: google.maps.Icon = {
            url: iconMap[store.type],
            scaledSize: new google.maps.Size(36, 36),
            anchor: new google.maps.Point(18, 36),
          };
          return (
            <Marker
              key={store.id}
              position={{ lat: store.lat, lng: store.lng }}
              title={store.name}
              icon={icon}
            />
          );
        })}

        {directionsResponse && (
          <DirectionsRenderer directions={directionsResponse} />
        )}
      </GoogleMap>

      <div style={{ marginTop: "10px" }}>
        <button onClick={handleFindNearest}>最寄りの購買を探す</button>
        <p>{info}</p>
      </div>
    </div>
  );
}
