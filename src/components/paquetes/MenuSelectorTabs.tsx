import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import type { CatalogoItem } from "../../hooks/useCatalogosPaquetes";

const tipos = [
	{ key: "platillos", label: "Platillos" },
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

	return (
		<div>
			<Tabs
				value={tab}
				onValueChange={setTab}
				defaultValue="platillos"
				className="mb-2"
			>
				<TabsList>
					{tipos.map((t) => (
						<TabsTrigger key={t.key} value={t.key}>
							{t.label}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
			<div className="flex gap-2 mb-2">
				<Input
					placeholder={`Buscar ${tipos.find((t) => t.key === tab)?.label?.toLowerCase()}`}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					aria-label="Buscar en catálogo"
				/>
				<select
					value={selected}
					onChange={(e) => setSelected(e.target.value)}
					className="border rounded px-2 py-1"
					aria-label="Seleccionar elemento"
					disabled={loading}
				>
					<option value="">Selecciona...</option>
					{items.map((item) => (
						<option key={item.id} value={item.id}>
							{item.nombre} {item.precio ? `($${item.precio})` : ""}
						</option>
					))}
				</select>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					onClick={() => {
						const item = items.find((i) => i.id === selected);
						if (item) {
							onAgregar({
								idCatalogo: item.id,
								tipo: tab.slice(0, -1), // platillos -> platillo
								nombre: item.nombre,
								precio: item.precio || 0,
							});
							setSelected("");
						}
					}}
					aria-label="Agregar al paquete"
					disabled={!selected}
				>
					<PlusCircle size={20} />
				</Button>
			</div>
		</div>
	);
}
