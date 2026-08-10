import { Button, Input } from "@/components/ui";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Search } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { listCatalogo } from "../../services/catalogoService";
import { logger } from "../../lib/logger";
const TAB_DEFINITIONS = {
	platillos: { label: "Catering", tipo: "Platillo", catalogoTipo: "platillos" },
	bebidas: { label: "Bebidas", tipo: "Bebida", catalogoTipo: "bebidas" },
	personal: { label: "Personal", tipo: "Personal", catalogoTipo: "personal" },
	mobiliario: { label: "Mobiliario", tipo: "Extra", catalogoTipo: "mobiliario" },
	audio: { label: "Audio", tipo: "Extra", catalogoTipo: "audio" },
	otros: { label: "Otros", tipo: "Extra", catalogoTipo: "otros" },
};
const TAB_KEYS = Object.keys(TAB_DEFINITIONS);

async function fetchCatalogoTop(catalogoTipo) {
	const response = await listCatalogo(catalogoTipo, {
		activo: true,
		top: 3,
		page: 1,
		pageSize: 3,
	});

	return {
		items: Array.isArray(response?.items) ? response.items : [],
		total: Number(response?.totalFiltrado ?? response?.total ?? 0),
	};
}

export default function CatalogTabs({ onNuevoItem, onAddItem, refreshKey, recentCatalogItem = null }) {
	const { control } = useFormContext();
	const { append } = useFieldArray({
		control,
		name: "items",
	});
	const [activeTab, setActiveTab] = useState("platillos");
	const [search, setSearch] = useState("");
	const [catalogos, setCatalogos] = useState({
		platillos: [],
		bebidas: [],
		personal: [],
		mobiliario: [],
		audio: [],
		otros: [],
	});
	const [catalogTotals, setCatalogTotals] = useState({
		platillos: 0,
		bebidas: 0,
		personal: 0,
		mobiliario: 0,
		audio: 0,
		otros: 0,
	});
	const [globalResults, setGlobalResults] = useState([]);
	const [searchingGlobal, setSearchingGlobal] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	// Cargar todos los catálogos al montar el componente
	useEffect(() => {
		const loadCatalogos = async () => {
			try {
				setLoading(true);
				setError("");
				const [platillosRes, bebidasRes, personalRes, mobiliarioRes, audioRes, otrosRes] = await Promise.all(
					TAB_KEYS.map((key) => fetchCatalogoTop(TAB_DEFINITIONS[key].catalogoTipo))
				);
				setCatalogos({
					platillos: platillosRes.items,
					bebidas: bebidasRes.items,
					personal: personalRes.items,
					mobiliario: mobiliarioRes.items,
					audio: audioRes.items,
					otros: otrosRes.items,
				});
				setCatalogTotals({
					platillos: platillosRes.total,
					bebidas: bebidasRes.total,
					personal: personalRes.total,
					mobiliario: mobiliarioRes.total,
					audio: audioRes.total,
					otros: otrosRes.total,
				});
			} catch (err) {
				logger.error("Error cargando catálogos:", err);
				setError("No se pudieron cargar los catálogos");
			} finally {
				setLoading(false);
			}
		};
		loadCatalogos();
	}, [refreshKey]);

	useEffect(() => {
		const term = String(search || "").trim();
		if (!term) {
			setGlobalResults([]);
			setSearchingGlobal(false);
			return;
		}

		let active = true;
		const timeoutId = setTimeout(async () => {
			try {
				setSearchingGlobal(true);
				const responses = await Promise.all(
					TAB_KEYS.map((key) =>
						listCatalogo(TAB_DEFINITIONS[key].catalogoTipo, {
							activo: true,
							nombre: term,
							page: 1,
							pageSize: 20,
							sortBy: "nombre",
							sortDir: "asc",
						})
					)
				);

				if (!active) return;

				const merged = responses.flatMap((res, index) => {
					const key = TAB_KEYS[index];
					const def = TAB_DEFINITIONS[key];
					return (Array.isArray(res?.items) ? res.items : []).map((item) => ({
						...item,
						catalogoTipo: def.catalogoTipo,
						tipo: def.tipo,
						catalogoLabel: def.label,
					}));
				});

				setGlobalResults(merged);
			} catch (err) {
				if (!active) return;
				logger.error("Error en búsqueda global de catálogos:", err);
				setGlobalResults([]);
			} finally {
				if (active) setSearchingGlobal(false);
			}
		}, 250);

		return () => {
			active = false;
			clearTimeout(timeoutId);
		};
	}, [search]);

	const catalogMap = {
		platillos: { ...TAB_DEFINITIONS.platillos, data: catalogos.platillos },
		bebidas: { ...TAB_DEFINITIONS.bebidas, data: catalogos.bebidas },
		personal: { ...TAB_DEFINITIONS.personal, data: catalogos.personal },
		mobiliario: { ...TAB_DEFINITIONS.mobiliario, data: catalogos.mobiliario },
		audio: { ...TAB_DEFINITIONS.audio, data: catalogos.audio },
		otros: { ...TAB_DEFINITIONS.otros, data: catalogos.otros },
	};

	const current = catalogMap[activeTab];
	const isGlobalSearch = String(search || "").trim().length > 0;
	const mergeRecentItem = (items, catalogoTipo) => {
		if (!recentCatalogItem || recentCatalogItem.catalogoTipo !== catalogoTipo) {
			return items;
		}

		const normalizedRecentId = String(recentCatalogItem.item?._id || recentCatalogItem.item?.id || "").trim();
		const normalizedRecentName = String(recentCatalogItem.item?.nombre || "").trim().toLowerCase();
		const alreadyIncluded = items.some((item) => {
			const itemId = String(item?._id || item?.id || "").trim();
			const itemName = String(item?.nombre || "").trim().toLowerCase();
			if (normalizedRecentId && itemId) return itemId === normalizedRecentId;
			return normalizedRecentName && itemName === normalizedRecentName;
		});

		if (alreadyIncluded) return items;

		return [
			{
				...recentCatalogItem.item,
				catalogoTipo,
				tipo: TAB_DEFINITIONS[catalogoTipo]?.tipo,
				catalogoLabel: TAB_DEFINITIONS[catalogoTipo]?.label,
			},
			...items,
		];
	};

	const visibleItems = useMemo(() => {
		if (isGlobalSearch) {
			const filteredGlobalResults = globalResults;
			if (!recentCatalogItem) return filteredGlobalResults;

			const term = String(search || "").trim().toLowerCase();
			const recentName = String(recentCatalogItem.item?.nombre || "").trim().toLowerCase();
			if (!recentName || (term && !recentName.includes(term))) return filteredGlobalResults;

			return mergeRecentItem(filteredGlobalResults, recentCatalogItem.catalogoTipo);
		}

		return mergeRecentItem(current.data, current.catalogoTipo);
	}, [isGlobalSearch, globalResults, current.data, current.catalogoTipo, mergeRecentItem, recentCatalogItem, search]);

	const addItem = (item) => {
		const itemTipo = item.tipo || current.tipo;
		const itemCatalogoTipo = item.catalogoTipo || current.catalogoTipo;
		const normalizedItem = {
			tipo: itemTipo,
			nombre: item.nombre,
			precio: Number(item.precio || 0),
			cantidad: 1,
			catalogoTipo: itemCatalogoTipo,
			applyDurationMultiplier: true,
		};

		if (typeof onAddItem === "function") {
			onAddItem(normalizedItem);
			return;
		}

		append(normalizedItem, { shouldFocus: false });
		// No toast
	};

	if (loading) {
		return (
			<div className="px-4 py-6 text-sm text-[#64748B] text-center">
				Cargando catálogos...
			</div>
		);
	}

	if (error) {
		return (
			<div className="px-4 py-6 text-sm text-red-600 text-center">
				{error}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200">
				{Object.entries(catalogMap).map(([key, tab]) => (
					<button
						key={key}
						type="button"
						onClick={() => setActiveTab(key)}
						className={`flex-1 h-9 rounded-lg text-sm font-medium transition-all ${
							activeTab === key ? "bg-white text-[#111827] shadow-sm" : "text-[#64748B] hover:text-[#111827]"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="relative flex gap-2 items-center">
				<div className="flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar en todos los catálogos..."
						className="h-11 pl-10 rounded-xl border-slate-200"
					/>
				</div>
				{typeof onNuevoItem === "function" && (
					<Button type="button" variant="outline" size="sm" className="h-11" onClick={() => onNuevoItem(current.catalogoTipo)}>
						<Plus className="w-4 h-4 mr-1" /> Nuevo {current.label}
					</Button>
				)}
			</div>

			<div className="border border-slate-200 rounded-xl overflow-hidden">
				{searchingGlobal ? (
					<div className="px-4 py-6 text-sm text-[#64748B] text-center">Buscando en todos los catálogos...</div>
				) : visibleItems.length === 0 ? (
					<div className="px-4 py-6 text-sm text-[#64748B] text-center">
						{isGlobalSearch ? "No hay resultados en los catálogos." : `No hay resultados en ${current.label.toLowerCase()}.`}
					</div>
				) : (
					<ul className="divide-y divide-slate-200">
						{visibleItems.map((item) => (
							<li key={item._id || item.id} className="px-4 py-3 flex items-center justify-between gap-3">
								<div>
									{isGlobalSearch && (
										<p className="text-[11px] font-semibold text-[#2563eb] mb-1">{item.catalogoLabel || current.label}</p>
									)}
									<p className="text-sm font-medium text-[#111827]">{item.nombre}</p>
									<p className="text-xs text-[#64748B]">
										{Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(item.precio)}
									</p>
								</div>
								<Button type="button" variant="outline" size="sm" className="h-8" onClick={() => addItem(item)}>
									<Plus className="w-3.5 h-3.5 mr-1" /> Agregar
								</Button>
							</li>
						))}
					</ul>
				)}
				{!isGlobalSearch && catalogTotals[activeTab] > 3 && (
					<div className="px-4 py-2 text-xs text-[#64748B] text-center">
						Este catálogo tiene más productos.
					</div>
				)}
			</div>
		</div>
	);
}
