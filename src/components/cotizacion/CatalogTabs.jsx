import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { useFormContext } from "react-hook-form";

const mockPlatillos = [
	{ id: "p1", nombre: "Pollo en mole", precio: 180 },
	{ id: "p2", nombre: "Filete de res", precio: 220 },
];
const mockBebidas = [
	{ id: "b1", nombre: "Refresco", precio: 30 },
	{ id: "b2", nombre: "Vino tinto", precio: 120 },
];
const mockPersonal = [
	{ id: "per1", nombre: "Mesero", precio: 500 },
	{ id: "per2", nombre: "Chef", precio: 1200 },
];
const mockPaquetes = [
	{ id: "paq1", nombre: "Paquete Oro", precio: 10000 },
	{ id: "paq2", nombre: "Paquete Plata", precio: 7000 },
];

export default function CatalogTabs() {
	const { setValue, getValues } = useFormContext();
	const addItem = (tipo, item) => {
		const items = getValues("items") || [];
		setValue("items", [
			...items,
			{ tipo, nombre: item.nombre, precio: item.precio, cantidad: 1 },
		]);
	};
	return (
		<Tabs defaultValue="platillos">
			<TabsList>
				<TabsTrigger value="platillos">Platillos</TabsTrigger>
				<TabsTrigger value="bebidas">Bebidas</TabsTrigger>
				<TabsTrigger value="personal">Personal</TabsTrigger>
				<TabsTrigger value="paquetes">Paquetes</TabsTrigger>
			</TabsList>
			<TabsContent value="platillos">
				<ul className="space-y-2">
					{mockPlatillos.map((p) => (
						<li key={p.id} className="flex items-center justify-between">
							<span>
								{p.nombre}{" "}
								<span className="text-gray-500 text-xs">(${p.precio})</span>
							</span>
							<Button size="sm" onClick={() => addItem("Platillo", p)}>
								Agregar
							</Button>
						</li>
					))}
				</ul>
			</TabsContent>
			<TabsContent value="bebidas">
				<ul className="space-y-2">
					{mockBebidas.map((b) => (
						<li key={b.id} className="flex items-center justify-between">
							<span>
								{b.nombre}{" "}
								<span className="text-gray-500 text-xs">(${b.precio})</span>
							</span>
							<Button size="sm" onClick={() => addItem("Bebida", b)}>
								Agregar
							</Button>
						</li>
					))}
				</ul>
			</TabsContent>
			<TabsContent value="personal">
				<ul className="space-y-2">
					{mockPersonal.map((p) => (
						<li key={p.id} className="flex items-center justify-between">
							<span>
								{p.nombre}{" "}
								<span className="text-gray-500 text-xs">(${p.precio})</span>
							</span>
							<Button size="sm" onClick={() => addItem("Personal", p)}>
								Agregar
							</Button>
						</li>
					))}
				</ul>
			</TabsContent>
			<TabsContent value="paquetes">
				<ul className="space-y-2">
					{mockPaquetes.map((p) => (
						<li key={p.id} className="flex items-center justify-between">
							<span>
								{p.nombre}{" "}
								<span className="text-gray-500 text-xs">(${p.precio})</span>
							</span>
							<Button size="sm" onClick={() => addItem("Paquete", p)}>
								Agregar
							</Button>
						</li>
					))}
				</ul>
			</TabsContent>
		</Tabs>
	);
}
