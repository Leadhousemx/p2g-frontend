export function Card({ className="", ...p }){ return <div className={"bg-white rounded-2xl shadow "+className} {...p}/>; }
export function CardHeader({ className="", ...p }){ return <div className={"p-4 border-b "+className} {...p}/>; }
export function CardContent({ className="", ...p }){ return <div className={"p-4 "+className} {...p}/>; }
export function CardFooter({ className="", ...p }){ return <div className={"p-4 border-t "+className} {...p}/>; }
export default Card;
