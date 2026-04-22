"use client";

import { useMemo, useState } from "react";
import { catalogue, suppliers } from "@/data/mockData";
import {
  filterPartsForVehicle,
  getBestPrice,
  getNearestSupplier,
  rankSuppliersForPart
} from "@/lib/recommendation";
import { Part, VehicleProfile } from "@/types";

type Role = "client" | "supplier";
type AuthStage = "welcome" | "login" | "signup" | "app";

const defaultProfile: VehicleProfile = {
  make: "Toyota",
  model: "Corolla",
  year: "2021",
  engine: "1.6"
};

const infoChipStyle: Record<string, string> = {
  bestPrice: "bg-[#ffd0bf] text-[#7a2100]",
  nearest: "bg-[#d2f4df] text-[#0b5137]",
  total: "bg-[#fff0bc] text-[#5f4b00]"
};

export default function PartifyExperience() {
  const [stage, setStage] = useState<AuthStage>("welcome");
  const [role, setRole] = useState<Role>("client");
  const [activeTab, setActiveTab] = useState("search");
  const [name, setName] = useState("Robyn");
  const [email, setEmail] = useState("robyn@partify.app");
  const [password, setPassword] = useState("password123");

  const [vehicle, setVehicle] = useState<VehicleProfile>(defaultProfile);
  const [query, setQuery] = useState("90915");
  const [selectedPartNumber, setSelectedPartNumber] = useState("90915-YZZE1");

  const [supplierInventory, setSupplierInventory] = useState(() =>
    suppliers[0].inventory.map((item) => ({ ...item }))
  );

  const vehicleParts = useMemo(() => {
    const direct = filterPartsForVehicle(catalogue, vehicle);
    if (direct.length > 0) {
      return direct;
    }
    return catalogue;
  }, [vehicle]);

  const searchedParts = useMemo(() => {
    const token = query.toLowerCase().trim();
    if (!token) {
      return vehicleParts;
    }

    return vehicleParts.filter((part) => {
      return (
        part.partNumber.toLowerCase().includes(token) ||
        part.name.toLowerCase().includes(token)
      );
    });
  }, [query, vehicleParts]);

  const selectedPart: Part | undefined = useMemo(
    () => searchedParts.find((part) => part.partNumber === selectedPartNumber),
    [searchedParts, selectedPartNumber]
  );

  const ranked = useMemo(
    () =>
      selectedPart ? rankSuppliersForPart(suppliers, selectedPart.partNumber) : [],
    [selectedPart]
  );

  const nearest = ranked.length > 0 ? getNearestSupplier(ranked) : null;
  const bestPrice = ranked.length > 0 ? getBestPrice(ranked) : null;

  const clientTabs = [
    { key: "search", label: "Search" },
    { key: "saved", label: "Saved" },
    { key: "profile", label: "Profile" }
  ];

  const supplierTabs = [
    { key: "inventory", label: "Inventory" },
    { key: "updates", label: "Updates" },
    { key: "profile", label: "Profile" }
  ];

  const handleAuth = () => {
    setStage("app");
    setActiveTab(role === "client" ? "search" : "inventory");
  };

  const updateInventoryStock = (partNumber: string, stock: number) => {
    setSupplierInventory((current) =>
      current.map((item) =>
        item.partNumber === partNumber ? { ...item, stock: Number(stock) } : item
      )
    );
  };

  return (
    <main className="app-main">
      <div className="phone-shell reveal">
        <div className="app-topbar">
          <p className="pill bg-[#ffd9c2] text-[#833915]">Partify</p>
          <p className="text-xs font-semibold text-[#4f5f58]">Cape Town pilot</p>
        </div>

        <div className="app-content">
          {stage === "welcome" && (
            <section className="screen-panel">
              <p className="pill bg-[#d2f4df] text-[#0b5137]">Mechanic and driver flow</p>
              <h1 className="mt-3 text-4xl">Right part. Right now.</h1>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Find in-stock parts nearby, compare total cost with travel, and choose
                faster.
              </p>

              <div className="mt-6 space-y-2">
                <button className="action-btn" onClick={() => setStage("login")} type="button">
                  Log in
                </button>
                <button
                  className="action-btn ghost"
                  onClick={() => setStage("signup")}
                  type="button"
                >
                  Create account
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-[#e4dcc8] bg-[#fffbef] p-4">
                <h2 className="text-lg">Role</h2>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    className={`role-btn ${role === "client" ? "active" : ""}`}
                    onClick={() => setRole("client")}
                    type="button"
                  >
                    Client
                  </button>
                  <button
                    className={`role-btn ${role === "supplier" ? "active" : ""}`}
                    onClick={() => setRole("supplier")}
                    type="button"
                  >
                    Supplier
                  </button>
                </div>
              </div>
            </section>
          )}

          {(stage === "login" || stage === "signup") && (
            <section className="screen-panel">
              <h1 className="text-3xl">{stage === "login" ? "Welcome back" : "Create account"}</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {stage === "login"
                  ? "Continue to your personalized part feed."
                  : "Set up your role and continue to your app dashboard."}
              </p>

              {stage === "signup" && (
                <label className="mt-4 block text-sm font-semibold text-[#2f2f2f]">
                  Full name
                  <input
                    className="mt-1 w-full rounded-xl border border-[#d6d2c6] bg-white px-3 py-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}

              <label className="mt-3 block text-sm font-semibold text-[#2f2f2f]">
                Email
                <input
                  className="mt-1 w-full rounded-xl border border-[#d6d2c6] bg-white px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="mt-3 block text-sm font-semibold text-[#2f2f2f]">
                Password
                <input
                  className="mt-1 w-full rounded-xl border border-[#d6d2c6] bg-white px-3 py-2"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <div className="mt-4 rounded-2xl border border-[#e4dcc8] bg-[#fffbef] p-3">
                <p className="text-sm font-semibold">I am signing in as</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    className={`role-btn ${role === "client" ? "active" : ""}`}
                    onClick={() => setRole("client")}
                    type="button"
                  >
                    Client
                  </button>
                  <button
                    className={`role-btn ${role === "supplier" ? "active" : ""}`}
                    onClick={() => setRole("supplier")}
                    type="button"
                  >
                    Supplier
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button className="action-btn" onClick={handleAuth} type="button">
                  Continue
                </button>
                <button className="action-btn ghost" onClick={() => setStage("welcome")} type="button">
                  Back
                </button>
              </div>
            </section>
          )}

          {stage === "app" && role === "client" && (
            <section className="screen-panel">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl">Hi {name}</h1>
                  <p className="text-sm text-[var(--muted)]">Find your part in under 2 minutes.</p>
                </div>
                <button className="small-btn" onClick={() => setRole("supplier")} type="button">
                  Supplier view
                </button>
              </div>

              {activeTab === "search" && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-[#dfd7c7] bg-[#fffdf6] p-3">
                    <h2 className="text-lg">Vehicle profile</h2>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        className="rounded-xl border border-[#d6d2c6] bg-white px-3 py-2 text-sm"
                        value={vehicle.make}
                        onChange={(e) =>
                          setVehicle((prev) => ({ ...prev, make: e.target.value }))
                        }
                        placeholder="Make"
                      />
                      <input
                        className="rounded-xl border border-[#d6d2c6] bg-white px-3 py-2 text-sm"
                        value={vehicle.model}
                        onChange={(e) =>
                          setVehicle((prev) => ({ ...prev, model: e.target.value }))
                        }
                        placeholder="Model"
                      />
                      <input
                        className="rounded-xl border border-[#d6d2c6] bg-white px-3 py-2 text-sm"
                        value={vehicle.year}
                        onChange={(e) =>
                          setVehicle((prev) => ({ ...prev, year: e.target.value }))
                        }
                        placeholder="Year"
                      />
                      <input
                        className="rounded-xl border border-[#d6d2c6] bg-white px-3 py-2 text-sm"
                        value={vehicle.engine}
                        onChange={(e) =>
                          setVehicle((prev) => ({ ...prev, engine: e.target.value }))
                        }
                        placeholder="Engine"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#dfd7c7] bg-white p-3">
                    <input
                      className="w-full rounded-xl border border-[#d6d2c6] bg-white px-3 py-2 text-sm"
                      placeholder="Search by part number or part name"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />

                    <div className="mt-2 flex gap-2 overflow-auto pb-1">
                      {searchedParts.map((part) => (
                        <button
                          key={part.id}
                          className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${
                            part.partNumber === selectedPartNumber
                              ? "border-[#d65f2e] bg-[#ffe7dc]"
                              : "border-[#d6d2c6] bg-[#faf9f5]"
                          }`}
                          onClick={() => setSelectedPartNumber(part.partNumber)}
                          type="button"
                        >
                          {part.partNumber}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ranked.map((result) => {
                      const isBestPrice = bestPrice?.supplier.id === result.supplier.id;
                      const isNearest = nearest?.supplier.id === result.supplier.id;

                      return (
                        <article
                          key={result.supplier.id}
                          className="rounded-2xl border border-[#dfd7c7] bg-white p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold">{result.supplier.name}</p>
                              <p className="text-xs text-[#5f6258]">
                                {result.supplier.location} · {result.supplier.distanceKm} km
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {isNearest && (
                                <span className={`pill ${infoChipStyle.nearest}`}>Closest</span>
                              )}
                              {isBestPrice && (
                                <span className={`pill ${infoChipStyle.bestPrice}`}>Best price</span>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                            <p>Part: R{result.itemPrice.toFixed(0)}</p>
                            <p>Fuel: R{result.fuelCostEstimate.toFixed(0)}</p>
                            <p>Total: R{result.totalCost.toFixed(0)}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "saved" && (
                <div className="mt-4 rounded-2xl border border-[#dfd7c7] bg-white p-4">
                  <h2 className="text-lg">Saved jobs</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Toyota Corolla brake service, VW Polo oil filter pickup, and Ford Ranger
                    rear pads are queued here.
                  </p>
                </div>
              )}

              {activeTab === "profile" && (
                <div className="mt-4 rounded-2xl border border-[#dfd7c7] bg-white p-4">
                  <h2 className="text-lg">Profile</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">{email}</p>
                  <button className="action-btn mt-4" onClick={() => setStage("welcome")} type="button">
                    Sign out
                  </button>
                </div>
              )}

              <nav className="bottom-nav">
                {clientTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={`nav-btn ${activeTab === tab.key ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </section>
          )}

          {stage === "app" && role === "supplier" && (
            <section className="screen-panel">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl">Supplier console</h1>
                  <p className="text-sm text-[var(--muted)]">Atlantic Auto Spares</p>
                </div>
                <button className="small-btn" onClick={() => setRole("client")} type="button">
                  Client view
                </button>
              </div>

              {activeTab === "inventory" && (
                <div className="mt-4 space-y-2">
                  {supplierInventory.map((entry) => {
                    const partName =
                      catalogue.find((item) => item.partNumber === entry.partNumber)?.name ??
                      entry.partNumber;

                    return (
                      <div
                        key={entry.partNumber}
                        className="rounded-2xl border border-[#dfd7c7] bg-white p-3"
                      >
                        <p className="text-sm font-bold">{partName}</p>
                        <p className="text-xs text-[#5f6258]">{entry.partNumber}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label className="text-xs">
                            Price (R)
                            <input
                              type="number"
                              className="mt-1 w-full rounded-xl border border-[#d6d2c6] bg-white px-2 py-1"
                              value={entry.priceZar}
                              readOnly
                            />
                          </label>
                          <label className="text-xs">
                            Stock
                            <input
                              type="number"
                              className="mt-1 w-full rounded-xl border border-[#d6d2c6] bg-white px-2 py-1"
                              value={entry.stock}
                              onChange={(e) =>
                                updateInventoryStock(entry.partNumber, Number(e.target.value))
                              }
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "updates" && (
                <div className="mt-4 rounded-2xl border border-[#dfd7c7] bg-white p-4">
                  <h2 className="text-lg">Today updates</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    14 stock updates, 7 price checks, and 3 client reservation requests.
                  </p>
                </div>
              )}

              {activeTab === "profile" && (
                <div className="mt-4 rounded-2xl border border-[#dfd7c7] bg-white p-4">
                  <h2 className="text-lg">Supplier profile</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">support@atlanticparts.co.za</p>
                  <button className="action-btn mt-4" onClick={() => setStage("welcome")} type="button">
                    Sign out
                  </button>
                </div>
              )}

              <nav className="bottom-nav">
                {supplierTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={`nav-btn ${activeTab === tab.key ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </section>
          )}
        </div>
      </div>

      <section className="experience-notes reveal">
        <h2 className="text-xl">Product note</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          You are right to prioritize Figma before full build-out. This implementation now
          mirrors an app journey so your wireframes can map 1:1 to real screens.
        </p>
      </section>
    </main>
  );
}
