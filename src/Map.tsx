import {
  GoogleMap,
  useLoadScript,
  Marker,
  DirectionsRenderer,
  OverlayView,
} from "@react-google-maps/api";
import { useMemo, useState } from "react";

type Store = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "vending" | "shop" | "drink";
};

const containerStyle = { width: "100%", height: "60vh" };

const iconMap: Record<Store["type"], string> = {
  vending: "/icons/vending.png",
  shop: "/icons/konbini.jpg",
  drink: "/icons/jihan.jpg",
};

export default function Map() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const origin = useMemo(() => ({ lat: 34.7411061, lng: 135.6588796 }), []);

  const [stores] = useState<Store[]>([
    {
      id: "1",
      name: "サントリー",
      lat: 34.7424161,
      lng: 135.6591338,
      type: "shop",
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
      name: "サントリー meiji",
      lat: 34.7434206,
      lng: 135.6597312,
      type: "drink",
    },
    {
      id: "4",
      name: "サントリー コカコーラ",
      lat: 34.7436201,
      lng: 135.6607461,
      type: "drink",
    },
    {
      id: "5",
      name: "自販機",
      lat: 34.7427228,
      lng: 135.6606733,
      type: "drink",
    },
    {
      id: "6",
      name: "自販機",
      lat: 34.7425927,
      lng: 135.662003,
      type: "drink",
    },
  ]);

  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);
  const [sortedStores, setSortedStores] = useState<
    { store: Store; distance: string; duration: string }[]
  >([]);
  const [nearestId, setNearestId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [filter, setFilter] = useState<"all" | "vending" | "shop" | "drink">(
    "all"
  );

  const getIcon = (type: Store["type"]) => {
    let size = new google.maps.Size(36, 36);

    // 自販機だけ大きくする
    if (type === "drink") {
      size = new google.maps.Size(80, 80);
    }

    return {
      url: iconMap[type],
      scaledSize: size,
      anchor: new google.maps.Point(size.width / 2, size.height),
    };
  };

  const handleFindNearest = () => {
    if (!google || !google.maps) return;
    const directionsService = new google.maps.DirectionsService();

    const filteredStores =
      filter === "all" ? stores : stores.filter((s) => s.type === filter);

    const promises = filteredStores.map(
      (store) =>
        new Promise<{
          store: Store;
          distance: string;
          duration: string;
        } | null>((resolve) => {
          const request: google.maps.DirectionsRequest = {
            origin,
            destination: { lat: store.lat, lng: store.lng },
            travelMode: google.maps.TravelMode.WALKING,
          };

          directionsService.route(request, (result, status) => {
            if (status === "OK" && result) {
              const leg = result.routes[0].legs[0];
              resolve({
                store,
                distance: leg.distance?.text ?? "不明",
                duration: leg.duration?.text ?? "不明",
              });
            } else {
              resolve(null);
            }
          });
        })
    );

    Promise.all(promises).then((results) => {
      const valid = results.filter(
        (r): r is NonNullable<typeof r> => r !== null
      );
      valid.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      setSortedStores(valid);

      if (valid.length > 0) {
        const nearest = valid[0].store;
        setNearestId(nearest.id);
        const request: google.maps.DirectionsRequest = {
          origin,
          destination: { lat: nearest.lat, lng: nearest.lng },
          travelMode: google.maps.TravelMode.WALKING,
        };
        directionsService.route(request, (result, status) => {
          if (status === "OK" && result) {
            setDirectionsResponse(result);
          }
        });
      }

      setShowLabels(true);
    });
  };

  if (!isLoaded) return <div>地図を読み込み中...</div>;

  const filteredStores =
    filter === "all" ? stores : stores.filter((s) => s.type === filter);

  return (
    <div style={{ display: "flex", gap: "20px", width: "100%" }}>
      {/* 左：地図 */}
      <div style={{ flex: 4 }}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ marginRight: "8px", fontWeight: "bold" }}>
            表示フィルタ：
          </label>
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as "all" | "vending" | "shop" | "drink")
            }
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          >
            <option value="all">すべて表示</option>
            <option value="shop">購買施設のみ</option>
            <option value="drink">自販機のみ</option>
          </select>
        </div>

        <GoogleMap mapContainerStyle={containerStyle} center={origin} zoom={16}>
          <Marker position={origin} label="出発地" />
          {filteredStores.map((store) => (
            <div key={store.id}>
              <Marker
                position={{ lat: store.lat, lng: store.lng }}
                title={store.name}
                icon={getIcon(store.type)}
              />
              {showLabels && (
                <OverlayView
                  position={{ lat: store.lat + 0.00006, lng: store.lng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div
                    style={{
                      color: "black",
                      fontWeight: "bold",
                      fontSize: "13px",
                      backgroundColor: "transparent",
                      whiteSpace: "nowrap",
                      transform: "translate(-50%, -100%)",
                    }}
                  >
                    {store.name}
                  </div>
                </OverlayView>
              )}
            </div>
          ))}
          {directionsResponse && (
            <DirectionsRenderer directions={directionsResponse} />
          )}
        </GoogleMap>

        <div style={{ marginTop: "10px" }}>
          <button
            onClick={handleFindNearest}
            style={{
              backgroundColor: "#1E90FF",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            最寄りの購買を探す
          </button>
        </div>
      </div>

      {/* 右：リスト */}
      <div style={{ flex: 1 }}>
        <h3
          style={{
            color: "#333",
            borderBottom: "2px solid #1E90FF",
            paddingBottom: "4px",
          }}
        >
          距離順（{filter === "all" ? "すべて" : filter}）
        </h3>
        <ul style={{ listStyle: "none", padding: 0, marginTop: "12px" }}>
          {sortedStores.map((s) => (
            <li
              key={s.store.id}
              style={{
                backgroundColor:
                  s.store.id === nearestId ? "#eaf4ff" : "#f9f9f9",
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "10px 12px",
                marginBottom: "10px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <strong style={{ color: "#1E90FF" }}>{s.store.name}</strong>
              <div style={{ fontSize: "14px", color: "#555" }}>
                距離: {s.distance}・時間: {s.duration}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
