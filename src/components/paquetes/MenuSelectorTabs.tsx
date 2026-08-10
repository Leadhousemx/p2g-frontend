import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import type { CatalogoItem } from "../../services/catalogoService";

const tipos = [
	{ key: "platillos", label: "Catering" },
	{ key: "bebidas", label: "Bebidas" },
	{ key: "mobiliario", label: "Mobiliario" },
	{ key: "personal", label: "Personal" },
	{ key: "adicionales", label: "Adicionales" },
];

interface Props {
	platillos: CatalogoItem[];
	bebidas: CatalogoItem[];
	mobiliario: CatalogoItem[];
	personal: CatalogoItem[];
	adicionales: CatalogoItem[];
	loading: boolean;
	onAgregar: (el: {
		idCatalogo: string;
		tipo: string;
		nombre: string;
		precio: number;
	}) => void;
}

export default function MenuSelectorTabs({
	platillos,
	bebidas,
	mobiliario,
	personal,
	adicionales,
	loading,
	onAgregar,
}: Props) {
	const [tab, setTab] = useState("platillos");
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<string>("");

	const catalogos: Record<string, CatalogoItem[]> = {
		platillos,
		bebidas,
		mobiliario,
		personal,
		adicionales,
	};

	const items = catalogos[tab].filter((item) =>
		item.nombre.toLowerCase().includes(search.toLowerCase())
	);
	const selectedItem = items.find((item) => item._id === selected) || null;

	return (
		<div className="space-y-4">
			<Tabs
				value={tab}
				onValueChange={(nextTab) => {
					setTab(nextTab);
					setSearch("");
					setSelected("");
				}}
				defaultValue="platillos"
				className="w-full"
			>
				<TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 sm:grid-cols-3 xl:grid-cols-5">
					{tipos.map((t) => (
						<TabsTrigger key={t.key} value={t.key} className="min-h-10 rounded-xl px-3 py-2 text-xs sm:text-sm">
							{t.label}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
				<div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-sm font-semibold text-[#111827]">Selecciona elementos del catálogo</p>
							<p className="text-xs text-[#64748B]">Filtra por nombre y agrega una opción al paquete actual.</p>
						</div>
						<span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#64748B]">
							{items.length} disponibles
						</span>
					</div>

					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={16} />
						<Input
							placeholder={`Buscar ${tipos.find((t) => t.key === tab)?.label?.toLowerCase()}`}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							aria-label="Buscar en catálogo"
							className="pl-9"
						/>
					</div>

					<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
						<select
							value={selected}
							onChange={(e) => setSelected(e.target.value)}
							className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
							aria-label="Seleccionar elemento"
							disabled={loading}
						>
							<option value="">Selecciona un elemento...</option>
							{items.map((item) => (
								<option key={item._id} value={item._id}>
									{item.nombre} {item.precio ? `($${item.precio})` : ""}
								</option>
							))}
						</select>
						<Button
							type="button"
							onClick={() => {
								const item = items.find((i) => i._id === selected);
								if (item) {
									onAgregar({
										idCatalogo: item._id,
										tipo: tab.slice(0, -1),
										nombre: item.nombre,
										precio: item.precio || 0,
									});
									setSelected("");
								}
							}}
							aria-label="Agregar al paquete"
							disabled={!selected}
							className="h-11 w-full sm:w-auto"
						>
							<PlusCircle size={18} className="mr-2" />
							Agregar
						</Button>
					</div>
				</div>

				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Selección actual</p>
					{selectedItem ? (
						<div className="mt-3 space-y-2">
							<p className="text-sm font-semibold text-[#111827]">{selectedItem.nombre}</p>
							<p className="text-xs text-[#64748B]">
								{selectedItem.descripcion || "Sin descripción registrada"}
							</p>
							<div className="flex flex-wrap gap-2">
								<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-[#111827]">
									{selectedItem.precio ? `$${selectedItem.precio}` : "Sin precio"}
								</span>
								<span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-[#64748B]">
									{tipos.find((t) => t.key === tab)?.label}
								</span>
							</div>
						</div>
					) : (
						<p className="mt-3 text-sm text-[#64748B]">Selecciona un elemento para revisar rápidamente su información antes de agregarlo al paquete.</p>
					)}
				</div>
			</div>
		</div>
	);
}
