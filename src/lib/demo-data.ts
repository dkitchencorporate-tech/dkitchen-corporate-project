export type LanguageCode = 'es' | 'en' | 'fr';

export interface LocalizedString { es: string; en: string; fr: string; }
export interface MenuItem {
  id: string; name: LocalizedString; description: LocalizedString; price: number;
  category: string; image: string; allergens: string[]; isChefRecommendation?: boolean;
}
export type TemplateType = 'sushi' | 'tapas' | 'burger';

// ==========================================
// 1. DATA: ALTA GASTRONOMÍA (SUSHI / ASIAN)
// ==========================================
export const CATEGORIES_SUSHI = [
  { id: "s_ent_frios", name: { es: "Entrantes Fríos", en: "Cold Starters", fr: "Entrées Froides" } },
  { id: "s_ent_calientes", name: { es: "Entrantes Calientes", en: "Hot Starters", fr: "Entrées Chaudes" } },
  { id: "s_nigiris", name: { es: "Nigiris & Sashimi", en: "Nigiri & Sashimi", fr: "Nigiri & Sashimi" } },
  { id: "s_rolls", name: { es: "Rolls Especiales", en: "Special Rolls", fr: "Makis Spéciaux" } },
  { id: "s_principales", name: { es: "Principales", en: "Mains", fr: "Plats Principaux" } },
  { id: "s_postres", name: { es: "Postres Japoneses", en: "Japanese Desserts", fr: "Desserts Japonais" } },
  { id: "s_bodega", name: { es: "Sakes & Bodega", en: "Sakes & Wine", fr: "Sakés & Cave" } },
];

export const DEMO_MENU_SUSHI: MenuItem[] = [
  { id: "s1", category: "s_ent_frios", name: { es: "Tartar de Atún Balfegó", en: "Balfegó Tuna Tartare", fr: "Tartare de Thon" }, description: { es: "Exquisito corte de ventresca Balfegó fundente, marinado con aceite de sésamo tostado y yuzu fresco.", en: "Exquisite melting Balfegó belly cut, marinated with toasted sesame oil and fresh yuzu.", fr: "Coupe fondante de ventrèche Balfegó, marinée à l'huile de sésame toasté et yuzu frais." }, price: 24.0, allergens: ["PE", "SE", "SO"], isChefRecommendation: true, image: "/images/demo/s1.png" },
  { id: "s2", category: "s_ent_frios", name: { es: "Carpaccio de Pez Limón", en: "Yellowtail Carpaccio", fr: "Carpaccio de Sériole" }, description: { es: "Láminas traslúcidas de Hamachi regadas con nuestro ponzu trufado de autor y crujiente de ajo.", en: "Translucent slices of Hamachi drizzled with our signature truffled ponzu and garlic crisp.", fr: "Tranches translucides de Hamachi arrosées de notre ponzu truffé signature et croustillant d'ail." }, price: 21.0, allergens: ["PE", "SO", "GL"], image: "/images/demo/s2.png" },
  { id: "s3", category: "s_ent_frios", name: { es: "Ensalada Wakame Imperial", en: "Imperial Wakame Salad", fr: "Salade Wakame Impériale" }, description: { es: "Crujientes algas oceánicas marinadas en vinagre de arroz dulce y sésamo negro tostado.", en: "Crispy oceanic seaweed marinated in sweet rice vinegar and toasted black sesame.", fr: "Algues océaniques croustillantes marinées au vinaigre de riz doux et sésame noir grillé." }, price: 8.0, allergens: ["SE", "SO"], image: "/images/demo/s3.png" },
  { id: "s4", category: "s_ent_frios", name: { es: "Ostras Amélie al Ponzu", en: "Amélie Oysters with Ponzu", fr: "Huîtres Amélie au Ponzu" }, description: { es: "Media docena de ostras calibre nº3 con esferificaciones de ponzu cítrico y rábano picante.", en: "Half dozen no.3 oysters with citrus ponzu pearls and horseradish.", fr: "Demi-douzaine d'huîtres n°3 aux perles de ponzu d'agrumes et raifort." }, price: 28.0, allergens: ["MO", "SO"], image: "/images/demo/s4.png" },
  
  { id: "s5", category: "s_ent_calientes", name: { es: "Gyozas de Wagyu A5", en: "Wagyu A5 Gyozas", fr: "Gyozas de Wagyu A5" }, description: { es: "Empanadillas japonesas rellenas de auténtico Wagyu confitado a baja temperatura durante 12 horas.", en: "Japanese dumplings filled with authentic Wagyu confit slow-cooked for 12 hours.", fr: "Raviolis japonais farcis d'authentique Wagyu confit à basse température pendant 12 heures." }, price: 16.0, allergens: ["GL", "SO", "SE"], isChefRecommendation: true, image: "/images/demo/s5.png" },
  { id: "s6", category: "s_ent_calientes", name: { es: "Edamame Ahumado a la Brasa", en: "Smoked Grilled Edamame", fr: "Edamame Fumé au Grill" }, description: { es: "Vainas salteadas al rojo vivo en parrilla robata con escamas de sal Maldon y shichimi togarashi.", en: "Pods tossed red-hot on the robata grill with Maldon salt flakes and shichimi togarashi.", fr: "Gousses sautées au rouge sur le grill robata avec des flocons de sel Maldon et shichimi." }, price: 7.5, allergens: ["SO"], image: "/images/demo/s6.png" },
  { id: "s7", category: "s_ent_calientes", name: { es: "Tempura de Langostino Tigre", en: "Tiger Prawn Tempura", fr: "Tempura de Crevette Tigrée" }, description: { es: "Fritura aireada y crujiente de langostinos extra grandes con salsa tentsuyu templada.", en: "Airy and crispy fried extra-large prawns with warm tentsuyu sauce.", fr: "Friture aérienne et croustillante de grosses crevettes avec sauce tentsuyu tiède." }, price: 18.0, allergens: ["GL", "CR", "SO"], image: "/images/demo/s7.png" },
  { id: "s8", category: "s_ent_calientes", name: { es: "Berenjena Nasu Dengaku", en: "Nasu Dengaku Eggplant", fr: "Aubergine Nasu Dengaku" }, description: { es: "Suave berenjena fundente asada al fuego directo y glaseada con miso dulce caramelizado.", en: "Soft melting eggplant roasted over direct fire and glazed with caramelized sweet miso.", fr: "Aubergine fondante douce rôtie sur feu direct et glacée au miso doux caramélisé." }, price: 12.0, allergens: ["SO", "SE"], image: "/images/demo/s8.png" },
  
  { id: "s9", category: "s_nigiris", name: { es: "Nigiri de Ootoro Flambeado", en: "Flamed Ootoro Nigiri", fr: "Nigiri Ootoro Flambé" }, description: { es: "Suprema ventresca de atún derretida al soplete sobre arroz tibio koshihikari.", en: "Supreme tuna belly melted with a blowtorch over warm koshihikari rice.", fr: "Ventrèche de thon suprême fondue au chalumeau sur riz koshihikari tiède." }, price: 14.0, allergens: ["PE", "SO"], isChefRecommendation: true, image: "/images/demo/s9.png" },
  { id: "s10", category: "s_nigiris", name: { es: "Nigiri de Vieira y Trufa", en: "Scallop and Truffle Nigiri", fr: "Nigiri Saint-Jacques Truffe" }, description: { es: "Vieira cruda del pacífico coronada con sal rosa del himalaya y lámina de trufa fresca.", en: "Raw Pacific scallop topped with Himalayan pink salt and fresh truffle slice.", fr: "Saint-Jacques crue du Pacifique surmontée de sel rose de l'Himalaya et truffe fraîche." }, price: 11.0, allergens: ["MO", "SO"], image: "/images/demo/s10.png" },
  { id: "s11", category: "s_nigiris", name: { es: "Sashimi Moriawase Imperial", en: "Imperial Sashimi Moriawase", fr: "Sashimi Moriawase Impérial" }, description: { es: "Selección del chef de 12 cortes de los pescados más frescos y exclusivos del mercado hoy.", en: "Chef's selection of 12 cuts of the freshest and most exclusive fish at the market today.", fr: "Sélection du chef de 12 coupes des poissons les plus frais et exclusifs du marché d'aujourd'hui." }, price: 32.0, allergens: ["PE"], image: "/images/demo/s11.png" },
  { id: "s12", category: "s_nigiris", name: { es: "Nigiri Anguila Unagi", en: "Unagi Eel Nigiri", fr: "Nigiri Anguille Unagi" }, description: { es: "Anguila asada crujiente bañada en su propia salsa dulce caliente y un toque de sansho.", en: "Crispy roasted eel bathed in its own hot sweet sauce and a touch of sansho.", fr: "Anguille rôtie croustillante baignée dans sa propre sauce douce chaude et une touche de sansho." }, price: 12.0, allergens: ["PE", "SO", "GL"], image: "/images/demo/s12.png" },
  
  { id: "s13", category: "s_rolls", name: { es: "Spider Roll Soft Shell", en: "Soft Shell Spider Roll", fr: "Spider Roll Crabe Mou" }, description: { es: "Cangrejo de concha blanda en tempura crujiente, aguacate y mayonesa picante.", en: "Crispy tempura soft shell crab, avocado, and spicy mayonnaise.", fr: "Crabe à carapace molle en tempura croustillante, avocat et mayonnaise épicée." }, price: 21.0, allergens: ["CR", "GL", "HU", "SO"], image: "/images/demo/s13.png" },
  { id: "s14", category: "s_rolls", name: { es: "Volcano Roll Picante", en: "Spicy Volcano Roll", fr: "Volcano Roll Épicé" }, description: { es: "Núcleo de langostino tempurizado envuelto en tartar de atún extra picante con crujiente de tempura.", en: "Tempura prawn core wrapped in extra spicy tuna tartare with tempura crunch.", fr: "Cœur de crevette tempura enveloppé de tartare de thon extra épicé avec croustillant de tempura." }, price: 22.0, allergens: ["CR", "PE", "GL", "HU"], isChefRecommendation: true, image: "/images/demo/s14.png" },
  { id: "s15", category: "s_rolls", name: { es: "Dragon Roll Vegetal", en: "Vegan Dragon Roll", fr: "Dragon Roll Végan" }, description: { es: "Láminas de aguacate cremoso cubriendo espárragos crujientes y boniato glaseado.", en: "Creamy avocado slices covering crispy asparagus and glazed sweet potato.", fr: "Tranches d'avocat crémeux recouvrant des asperges croustillantes et de la patate douce glacée." }, price: 16.0, allergens: ["SE", "SO"], image: "/images/demo/s15.png" },
  { id: "s16", category: "s_rolls", name: { es: "Trufa Rainbow Roll", en: "Truffle Rainbow Roll", fr: "Rainbow Roll Truffe" }, description: { es: "Interior de cangrejo real cubierto por una gama de pescados supremos y láminas de trufa negra.", en: "King crab interior covered by a range of supreme fish and black truffle slices.", fr: "Intérieur de crabe royal recouvert d'une gamme de poissons suprêmes et tranches de truffe noire." }, price: 26.0, allergens: ["CR", "PE", "SO"], image: "/images/demo/s16.png" },
  
  { id: "s17", category: "s_principales", name: { es: "Bacalao Negro Gindara", en: "Black Cod", fr: "Morue Charbonnière" }, description: { es: "El icónico lomo macerado 48 horas en Saikyo Miso, horneado hasta su máxima caramelización y textura de seda.", en: "The iconic loin marinated 48 hours in Saikyo Miso, baked to maximum caramelization and silk texture.", fr: "Le filet emblématique mariné 48h au Saikyo Miso, cuit jusqu'à sa caramélisation maximale et texture soyeuse." }, price: 34.0, allergens: ["PE", "SO", "SE"], isChefRecommendation: true, image: "/images/demo/s17.png" },
  { id: "s18", category: "s_principales", name: { es: "Costilla de Wagyu A5", en: "Wagyu A5 Rib", fr: "Côte de Wagyu A5" }, description: { es: "Impresionante costillar deshuesado de cocción extremadamente lenta (24h) en caldo de soja añeja y mirin.", en: "Impressive boneless rib slow-cooked (24h) in aged soy broth and mirin.", fr: "Impressionnante côte désossée à cuisson extrêmement lente (24h) dans un bouillon de soja vieilli et mirin." }, price: 42.0, allergens: ["SO", "GL"], image: "/images/demo/s18.jpeg" },
  { id: "s19", category: "s_principales", name: { es: "Yakisoba Secreto Ibérico", en: "Iberian Yakisoba", fr: "Yakisoba Ibérique" }, description: { es: "Fideos artesanos salteados en wok ardiente con tiras de cerdo ibérico y verduras orgánicas crujientes.", en: "Artisan noodles stir-fried in a hot wok with Iberian pork strips and crispy organic vegetables.", fr: "Nouilles artisanales sautées dans un wok brûlant avec des lanières de porc ibérique et légumes bio croquants." }, price: 19.0, allergens: ["GL", "SO"], image: "/images/demo/s19.png" },
  { id: "s20", category: "s_principales", name: { es: "Tonkatsu de Solomillo", en: "Tenderloin Tonkatsu", fr: "Tonkatsu de Filet" }, description: { es: "Medallones de cerdo tierno rebozados en panko aéreo, servidos con salsa perrins japonesa casera.", en: "Tender pork medallions breaded in airy panko, served with homemade Japanese perrins sauce.", fr: "Médaillons de porc tendres panés au panko aérien, servis avec sauce perrins japonaise maison." }, price: 21.0, allergens: ["GL", "SO", "HU"], image: "/images/demo/s20.png" },
  
  { id: "s21", category: "s_postres", name: { es: "Mochi Helado de Té Matcha", en: "Matcha Ice Cream Mochi", fr: "Mochi Glacé au Matcha" }, description: { es: "Masa elástica de arroz dulce envolviendo un intenso núcleo helado de té matcha ceremonial.", en: "Elastic sweet rice dough wrapping an intense ceremonial matcha ice cream core.", fr: "Pâte de riz doux élastique enveloppant un cœur glacé intense de thé matcha de cérémonie." }, price: 7.0, allergens: ["LE"], image: "/images/demo/s21.png" },
  { id: "s22", category: "s_postres", name: { es: "Tarta de Queso Cítrica Yuzu", en: "Yuzu Citrus Cheesecake", fr: "Cheesecake Agrumes Yuzu" }, description: { es: "Nuestra tarta fluida de queso mascarpone coronada con gelatina fresca y ácida de yuzu silvestre.", en: "Our fluid mascarpone cheesecake topped with fresh and tart wild yuzu jelly.", fr: "Notre cheesecake fluide au mascarpone surmonté de gelée fraîche et acidulée de yuzu sauvage." }, price: 9.0, allergens: ["LE", "GL", "HU"], isChefRecommendation: true, image: "/images/demo/s22.jpeg" },
  { id: "s23", category: "s_postres", name: { es: "Volcán de Sésamo Negro", en: "Black Sesame Volcano", fr: "Volcan de Sésame Noir" }, description: { es: "Coulant recién horneado que derrama una lava espesa y cálida de sésamo negro tostado.", en: "Freshly baked coulant that spills a thick and warm lava of toasted black sesame.", fr: "Coulant fraîchement sorti du four qui déverse une lave épaisse et chaude de sésame noir grillé." }, price: 10.0, allergens: ["GL", "HU", "LE", "SE"], image: "/images/demo/s23.jpeg" },
  { id: "s24", category: "s_postres", name: { es: "Kakigori Nieve de Fresa", en: "Strawberry Snow Kakigori", fr: "Kakigori Neige Fraise" }, description: { es: "Hielo purificado raspado hasta alcanzar textura de nieve, bañado en sirope natural de fresas confitadas.", en: "Purified ice shaved to snow texture, bathed in natural candied strawberry syrup.", fr: "Glace purifiée grattée jusqu'à texture de neige, baignée dans un sirop naturel de fraises confites." }, price: 6.5, allergens: [], image: "/images/demo/s24.jpeg" },
  
  { id: "s25", category: "s_bodega", name: { es: "Sake Premium Dassai 23", en: "Premium Dassai 23 Sake", fr: "Saké Premium Dassai 23" }, description: { es: "El pináculo del Junmai Daiginjo. Arroz pulido al 23% para lograr una fragancia floral y un final limpio y sedoso.", en: "The pinnacle of Junmai Daiginjo. Rice polished to 23% to achieve a floral fragrance and a clean, silky finish.", fr: "Le summum du Junmai Daiginjo. Riz poli à 23% pour obtenir une fragrance florale et une finale propre et soyeuse." }, price: 120.0, allergens: ["SU"], isChefRecommendation: true, image: "/images/demo/s25.jpeg" },
  { id: "s26", category: "s_bodega", name: { es: "Albariño Gran Reserva", en: "Albariño Grand Reserve", fr: "Albariño Grande Réserve" }, description: { es: "Vino blanco gallego D.O. Rías Baixas. Acidez vibrante perfecta para equilibrar cortes grasos de pescado.", en: "Galician white wine D.O. Rías Baixas. Vibrant acidity perfect to balance fatty fish cuts.", fr: "Vin blanc galicien D.O. Rías Baixas. Acidité vibrante parfaite pour équilibrer les coupes de poissons gras." }, price: 28.0, allergens: ["SU"], image: "/images/demo/s26.jpeg" },
  { id: "s27", category: "s_bodega", name: { es: "Té Verde Orgánico Sencha", en: "Organic Sencha Green Tea", fr: "Thé Vert Bio Sencha" }, description: { es: "Infusión reconfortante de primera cosecha. Notas umami, herbáceas y ligeramente marinas.", en: "Comforting first-harvest infusion. Umami, herbaceous, and slightly marine notes.", fr: "Infusion réconfortante de première récolte. Notes umami, herbacées et légèrement marines." }, price: 5.5, allergens: [], image: "/images/demo/s27.jpeg" },
  { id: "s28", category: "s_bodega", name: { es: "Cerveza Asahi Super Dry", en: "Asahi Super Dry Beer", fr: "Bière Asahi Super Dry" }, description: { es: "La mítica cerveza japonesa. Sabor ultra limpio, crujiente y refrescante que limpia el paladar.", en: "The mythical Japanese beer. Ultra clean, crisp, and refreshing taste that cleanses the palate.", fr: "La mythique bière japonaise. Goût ultra propre, vif et rafraîchissant qui nettoie le palais." }, price: 4.5, allergens: ["GL"], image: "/images/demo/s28.jpeg" },
];

// ==========================================
// 2. DATA: BAR GRANADINO (TAPAS / RÚSTICO)
// ==========================================
export const CATEGORIES_TAPAS = [
  { id: "t_compartir", name: { es: "Para Compartir", en: "To Share", fr: "À Partager" } },
  { id: "t_frituras", name: { es: "Fritura Andaluza", en: "Andalusian Fried", fr: "Friture Andalouse" } },
  { id: "t_ibericos", name: { es: "Ibéricos y Quesos", en: "Iberian & Cheese", fr: "Ibériques & Fromages" } },
  { id: "t_guisos", name: { es: "Guisos Tradicionales", en: "Traditional Stews", fr: "Ragoûts Traditionnels" } },
  { id: "t_especialidades", name: { es: "Especialidades", en: "House Specialties", fr: "Spécialités" } },
  { id: "t_postres", name: { es: "Postres Caseros", en: "Homemade Desserts", fr: "Desserts Maison" } },
  { id: "t_bebidas", name: { es: "Bodega y Grifo", en: "Wine & Draft", fr: "Cave & Pression" } },
];

export const DEMO_MENU_TAPAS: MenuItem[] = [
  { id: "t1", category: "t_compartir", name: { es: "Auténtica Ensaladilla Rusa", en: "Authentic Russian Salad", fr: "Salade Russe Authentique" }, description: { es: "Patata nueva, mayonesa artesanal, huevo campero y coronada con generosas gambas blancas de Huelva.", en: "New potato, artisan mayonnaise, free-range egg, and topped with generous white prawns from Huelva.", fr: "Pomme de terre nouvelle, mayonnaise artisanale, œuf fermier et couronnée de généreuses crevettes blanches de Huelva." }, price: 9.5, allergens: ["HU", "CR", "PE"], isChefRecommendation: true, image: "/images/demo/t1.jpeg" },
  { id: "t2", category: "t_compartir", name: { es: "Pincho de Tortilla Babé", en: "Runny Spanish Omelette", fr: "Olette Espagnole Baveuse" }, description: { es: "Recién cuajada, con el centro deliciosamente líquido y cebolla caramelizada lentamente.", en: "Freshly set, with a deliciously liquid center and slowly caramelized onion.", fr: "Fraîchement prise, avec un centre délicieusement liquide et oignon lentement caramélisé." }, price: 4.5, allergens: ["HU"], image: "/images/demo/t2.jpeg" },
  { id: "t3", category: "t_compartir", name: { es: "Salmorejo Cordobés Sedoso", en: "Silky Cordoban Salmorejo", fr: "Salmorejo Soyeux" }, description: { es: "Crema fría y espesa de tomate pera, aceite de oliva virgen extra, taquitos de jamón ibérico y huevo duro.", en: "Cold and thick pear tomato cream, EVOO, Iberian ham cubes, and hard-boiled egg.", fr: "Crème froide et épaisse de tomate poire, huile d'olive vierge extra, dés de jambon ibérique et œuf dur." }, price: 6.5, allergens: ["GL", "HU"], image: "/images/demo/t3.jpeg" },
  { id: "t4", category: "t_compartir", name: { es: "Patatas Bravas Ahumadas", en: "Smoked Patatas Bravas", fr: "Patatas Bravas Fumées" }, description: { es: "Dados de patata confitados y fritos, bañados en una salsa brava casera secreta con pimentón de la Vera picante.", en: "Confit and fried potato cubes, bathed in a secret homemade brava sauce with spicy Vera paprika.", fr: "Dés de pomme de terre confits et frits, baignés dans une sauce brava maison secrète au paprika piquant de la Vera." }, price: 7.0, allergens: ["HU"], image: "/images/demo/t4.jpeg" },
  
  { id: "t5", category: "t_frituras", name: { es: "Croquetas Melosas de Rabo de Toro", en: "Oxtail Croquettes", fr: "Croquettes de Queue de Bœuf" }, description: { es: "Bechamel untuosa infusionada con el jugo de un guiso de rabo de toro de 6 horas, rebozadas en panko extracrujiente.", en: "Unctuous bechamel infused with 6-hour oxtail stew juices, breaded in extra-crispy panko.", fr: "Béchamel onctueuse infusée au jus d'un ragoût de queue de bœuf de 6h, panées au panko extra-croustillant." }, price: 11.0, allergens: ["GL", "LE", "HU"], isChefRecommendation: true, image: "/images/demo/t5.jpeg" },
  { id: "t6", category: "t_frituras", name: { es: "Cazón en Adobo Gaditano", en: "Marinated Dogfish", fr: "Requin Mariné" }, description: { es: "Dados de bienmesabe marinados en vinagre, orégano y comino, fritos en aceite de oliva a alta temperatura.", en: "Cubes of marinated fish in vinegar, oregano, and cumin, fried in high-temperature olive oil.", fr: "Dés de requin marinés au vinaigre, origan et cumin, frits dans l'huile d'olive à haute température." }, price: 12.5, allergens: ["PE", "GL", "SU"], image: "/images/demo/t6.jpeg" },
  { id: "t7", category: "t_frituras", name: { es: "Berenjenas con Miel de Caña", en: "Eggplants with Cane Honey", fr: "Aubergines au Miel de Canne" }, description: { es: "Finas láminas de berenjena frita, crujientes por fuera y tiernas por dentro, regadas con pura miel de caña.", en: "Thin slices of fried eggplant, crispy outside and tender inside, drizzled with pure cane honey.", fr: "Fines tranches d'aubergine frite, croustillantes à l'extérieur et tendres à l'intérieur, arrosées de pur miel de canne." }, price: 9.0, allergens: ["GL"], image: "/images/demo/t7.jpeg" },
  { id: "t8", category: "t_frituras", name: { es: "Calamares de Pota Fritos", en: "Fried Calamari", fr: "Calamars Frits" }, description: { es: "Anillas gruesas y tiernas con un rebozado ligero a la andaluza y una rodaja de limón.", en: "Thick and tender rings with a light Andalusian batter and a slice of lemon.", fr: "Anneaux épais et tendres avec une panure légère andalouse et une tranche de citron." }, price: 14.0, allergens: ["MO", "GL"], image: "/images/demo/t8.jpeg" },
  
  { id: "t9", category: "t_ibericos", name: { es: "Tabla Jamón 100% Bellota", en: "100% Acorn Ham Board", fr: "Planche Jambon 100% Gland" }, description: { es: "Lonchas sudorosas y veteadas de pura bellota, cortadas a cuchillo al momento por nuestro maestro jamonero.", en: "Sweaty and marbled slices of pure acorn ham, hand-carved to order by our master carver.", fr: "Tranches luisantes et persillées de pur gland, coupées au couteau à la demande par notre maître coupeur." }, price: 26.0, allergens: [], isChefRecommendation: true, image: "/images/demo/t9.jpeg" },
  { id: "t10", category: "t_ibericos", name: { es: "Queso Oveja Viejo Curado", en: "Aged Cured Sheep Cheese", fr: "Vieux Fromage de Brebis" }, description: { es: "Cuñas de queso potente con maduración de 12 meses, acompañado de almendras tostadas y picos camperos.", en: "Wedges of potent 12-month aged cheese, accompanied by roasted almonds and rustic breadsticks.", fr: "Quartiers de fromage puissant affiné 12 mois, accompagnés d'amandes grillées et de gressins rustiques." }, price: 16.0, allergens: ["LE", "FR", "GL"], image: "/images/demo/t10.jpeg" },
  { id: "t11", category: "t_ibericos", name: { es: "Surtido Ibérico de la Dehesa", en: "Iberian Assortment", fr: "Assortiment Ibérique" }, description: { es: "Selección premium de lomo doblado, chorizo de herradura y salchichón ibérico a la pimienta.", en: "Premium selection of pork loin, horseshoe chorizo, and Iberian pepper salami.", fr: "Sélection premium de filet de porc, chorizo en fer à cheval et saucisson ibérique au poivre." }, price: 20.0, allergens: ["LE"], image: "/images/demo/t11.jpeg" },
  { id: "t12", category: "t_ibericos", name: { es: "Tosta de Cecina de León", en: "Leon Cecina Toast", fr: "Toast de Cecina de León" }, description: { es: "Pan de cristal horneado con cecina ahumada, lascas de parmesano y un hilo de aceite de trufa.", en: "Baked crystal bread with smoked cecina, parmesan flakes, and a thread of truffle oil.", fr: "Pain de cristal cuit avec cecina fumée, copeaux de parmesan et un filet d'huile de truffe." }, price: 8.5, allergens: ["GL", "LE"], image: "/images/demo/t12.jpeg" },
  
  { id: "t13", category: "t_guisos", name: { es: "Carrillada Ibérica Estofada", en: "Stewed Pork Cheek", fr: "Joue de Porc Mijotée" }, description: { es: "Carrilleras que se deshacen en la boca, reducidas horas en vino Pedro Ximénez sobre puré trufado.", en: "Melt-in-your-mouth cheeks, reduced for hours in Pedro Ximénez wine over truffled puree.", fr: "Joues fondantes réduites des heures au vin Pedro Ximénez sur purée truffée." }, price: 16.5, allergens: ["SU", "LE"], isChefRecommendation: true, image: "/images/demo/t13.jpeg" },
  { id: "t14", category: "t_guisos", name: { es: "Callos a la Andaluza", en: "Andalusian Tripe", fr: "Tripes Andalouses" }, description: { es: "El guiso estrella de la casa. Un guiso contundente, denso y picantito con chorizo y morcilla.", en: "The house star stew. A hearty, dense, and spicy stew with chorizo and blood sausage.", fr: "Le ragoût star de la maison. Un ragoût copieux, dense et épicé avec chorizo et boudin noir." }, price: 14.0, allergens: [], image: "/images/demo/t14.jpeg" },
  { id: "t15", category: "t_guisos", name: { es: "Albóndigas Caseras en Salsa", en: "Homemade Meatballs in Sauce", fr: "Boulettes Maison en Sauce" }, description: { es: "Tiernas albóndigas de mezcla ternera-cerdo hundidas en una rica y espesa salsa de almendras tostadas.", en: "Tender beef-pork blend meatballs sunken in a rich and thick roasted almond sauce.", fr: "Tendres boulettes de bœuf et porc plongées dans une sauce riche et épaisse aux amandes grillées." }, price: 12.0, allergens: ["GL", "HU", "FR", "SU"], image: "/images/demo/t15.jpeg" },
  { id: "t16", category: "t_guisos", name: { es: "Guiso de Espinacas con Garbanzos", en: "Spinach & Chickpea Stew", fr: "Ragoût d'Épinards et Pois Chiches" }, description: { es: "Clásico sevillano vegetariano, potenciado con un majado de pan frito, ajos y pimentón dulce.", en: "Classic vegetarian Sevillian stew, enhanced with a mash of fried bread, garlic, and sweet paprika.", fr: "Classique sévillan végétarien, rehaussé d'une purée de pain frit, ail et paprika doux." }, price: 10.5, allergens: ["GL"], image: "/images/demo/t16.jpeg" },
  
  { id: "t17", category: "t_especialidades", name: { es: "Huevos Rotos con Jamón", en: "Broken Eggs with Ham", fr: "Œufs Cassés au Jambon" }, description: { es: "Cama de patatas fritas caseras cubiertas por tres huevos fritos de yema líquida y virutas de jamón ibérico.", en: "Bed of homemade fries covered by three fried eggs with runny yolks and Iberian ham shavings.", fr: "Lit de frites maison recouvert de trois œufs au plat à cœur coulant et copeaux de jambon ibérique." }, price: 15.0, allergens: ["HU"], isChefRecommendation: true, image: "/images/demo/t17.jpeg" },
  { id: "t18", category: "t_especialidades", name: { es: "Pluma Ibérica a la Brasa", en: "Grilled Iberian Pork Flank", fr: "Plume Ibérique Grillée" }, description: { es: "El corte más jugoso del cerdo ibérico, sellado a fuego fuerte para crear una costra crujiente con sal gorda.", en: "The juiciest cut of Iberian pork, seared over high heat to create a crispy crust with coarse salt.", fr: "La coupe la plus juteuse du porc ibérique, saisie à feu vif pour créer une croûte croustillante au gros sel." }, price: 21.0, allergens: [], image: "/images/demo/t18.jpeg" },
  { id: "t19", category: "t_especialidades", name: { es: "Pulpo a la Gallega Premium", en: "Premium Galician Octopus", fr: "Poulpe de Galice Premium" }, description: { es: "Pata de pulpo entera extremadamente tierna sobre cachelos, regada con oro líquido (AOVE) y pimentón dulce/picante.", en: "Extremely tender whole octopus leg over boiled potatoes, drizzled with liquid gold (EVOO) and sweet/spicy paprika.", fr: "Patte de poulpe entière extremadamente tendre sur pommes de terre vapeur, arrosée d'or liquide (AOVE) y paprika." }, price: 24.0, allergens: ["MO"], image: "/images/demo/t19.jpeg" },
  { id: "t20", category: "t_especialidades", name: { es: "Flamenquín XXL Casero", en: "Homemade XXL Flamenquín", fr: "Flamenquín XXL Maison" }, description: { es: "Espectacular rollo de lomo de cerdo relleno de jamón ibérico y queso fundido, empanado crujiente.", en: "Spectacular pork loin roll stuffed with Iberian ham and melted cheese, crispy breaded.", fr: "Spectaculaire rouleau de filet de porc farci au jambon ibérique et fromage fondu, panure croustillante." }, price: 13.5, allergens: ["GL", "LE", "HU"], image: "/images/demo/t20.jpeg" },
  
  { id: "t21", category: "t_postres", name: { es: "Tarta de Queso Fluida", en: "Fluid Cheesecake", fr: "Cheesecake Fluide" }, description: { es: "Tarta estilo La Viña, tostada y rústica por fuera, pero con un centro templado que se derrama al corte.", en: "La Viña style cake, toasted and rustic outside, but with a warm center that spills when cut.", fr: "Gâteau style La Viña, grillé et rustique à l'extérieur, mais avec un centre tiède qui coule à la coupe." }, price: 7.5, allergens: ["LE", "HU"], isChefRecommendation: true, image: "/images/demo/t21.jpeg" },
  { id: "t22", category: "t_postres", name: { es: "Torrija Caramelizada al Momento", en: "Caramelized Torrija", fr: "Torrija Caramélisée Minute" }, description: { es: "Pan brioche empapado en leche y especias, caramelizado con plancha y acompañado de helado de vainilla.", en: "Brioche bread soaked in milk and spices, caramelized with an iron and accompanied by vanilla ice cream.", fr: "Pain brioché trempé dans le lait et les épices, caramélisé à la plancha et accompagné de glace vanille." }, price: 8.0, allergens: ["GL", "LE", "HU"], image: "/images/demo/t22.jpeg" },
  { id: "t23", category: "t_postres", name: { es: "Piononos de Santa Fe", en: "Piononos de Santa Fe", fr: "Piononos de Santa Fe" }, description: { es: "El rey de los dulces granadinos. Bizcochos borrachos enrollados, coronados con crema tostada deliciosa.", en: "The king of Granadan sweets. Drunken sponge cake rolls, topped with delicious toasted cream.", fr: "Le roi des douceurs de Grenade. Rouleaux de génoise imbibés, couronnés d'une délicieuse crème brûlée." }, price: 6.0, allergens: ["GL", "LE", "HU", "SU"], image: "https://images.unsplash.com/photo-1519869325930-281384150729?w=400&q=50&fm=webp" },
  { id: "t24", category: "t_postres", name: { es: "Arroz con Leche Cremoso", en: "Creamy Rice Pudding", fr: "Riz au Lait Crémeux" }, description: { es: "Receta tradicional espesada a fuego lento con leche entera, canela en rama y piel de limón quemada.", en: "Traditional recipe thickened over low heat with whole milk, cinnamon stick, and burnt lemon peel.", fr: "Recette traditionnelle épaissie à feu doux avec du lait entier, bâton de cannelle et zeste de citron brûlé." }, price: 5.5, allergens: ["LE"], image: "https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=400&q=50&fm=webp" },
  
  { id: "t25", category: "t_bebidas", name: { es: "Cerveza Alhambra 1925", en: "Alhambra 1925 Beer", fr: "Bière Alhambra 1925" }, description: { es: "La icónica 'Milno'. Cerveza extra lager tostada, intensa y de alta graduación en su inconfundible botella verde sin etiqueta.", en: "The iconic 'Milno'. Extra toasted lager beer, intense and high-strength in its unmistakable green bottle.", fr: "L'iconique 'Milno'. Bière extra lager grillée, intense dans son incomparable bouteille verte sans étiquette." }, price: 3.5, allergens: ["GL"], isChefRecommendation: true, image: "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=400&q=50&fm=webp" },
  { id: "t26", category: "t_bebidas", name: { es: "Caña de Grifo Helada", en: "Ice Cold Draft Beer", fr: "Bière Pression Glacée" }, description: { es: "Copa ancha de 400ml de rubia tirada con maestría para conseguir dos dedos perfectos de crema.", en: "Wide 400ml glass of blonde beer masterfully drawn to achieve two perfect fingers of foam.", fr: "Verre large de 400ml de blonde tirée avec maîtrise pour obtenir deux doigts parfaits de mousse." }, price: 3.0, allergens: ["GL"], image: "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=400&q=50&fm=webp" },
  { id: "t27", category: "t_bebidas", name: { es: "Copa de Vino Tinto Rioja Crianza", en: "Rioja Crianza Red Wine Glass", fr: "Verre de Vin Rouge Rioja" }, description: { es: "Un tinto clásico, equilibrado y con toques a madera de roble, ideal para acompañar ibéricos y guisos.", en: "A classic red, balanced with oak wood notes, ideal to accompany Iberians and stews.", fr: "Un rouge classique, équilibré avec des notes de bois de chêne, idéal pour accompagner ibériques et ragoûts." }, price: 4.0, allergens: ["SU"], image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=50&fm=webp" },
  { id: "t28", category: "t_bebidas", name: { es: "Tinto de Verano Premium", en: "Premium Tinto de Verano", fr: "Tinto de Verano Premium" }, description: { es: "Vino tinto joven mezclado con refresco de limón, rodajas de cítricos frescos y extra de hielo.", en: "Young red wine mixed with lemon soda, fresh citrus slices, and extra ice.", fr: "Vin rouge jeune mélangé avec soda au citron, tranches d'agrumes fraîches y supplément de glace." }, price: 3.5, allergens: ["SU"], image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=50&fm=webp" },
];

// ==========================================
// 3. DATA: FAST FOOD PREMIUM (BURGER / PIZZA)
// ==========================================
export const CATEGORIES_BURGER = [
  { id: "b_entrantes", name: { es: "Entrantes & Fritos", en: "Starters & Fries", fr: "Entrées & Frites" } },
  { id: "b_smash_clasicas", name: { es: "Smash Clásicas", en: "Classic Smashes", fr: "Smash Classiques" } },
  { id: "b_smash_premium", name: { es: "Smash Premium", en: "Premium Smashes", fr: "Smash Premium" } },
  { id: "b_pizzas", name: { es: "Pizzas de Autor", en: "Signature Pizzas", fr: "Pizzas Signature" } },
  { id: "b_complementos", name: { es: "Salsas & Extras", en: "Sauces & Extras", fr: "Sauces & Extras" } },
  { id: "b_postres", name: { es: "Postres & Shakes", en: "Desserts & Shakes", fr: "Desserts & Shakes" } },
  { id: "b_bebidas", name: { es: "Refrescos Fríos", en: "Cold Drinks", fr: "Boissons Fraîches" } },
];

export const DEMO_MENU_BURGER: MenuItem[] = [
  { id: "b1", category: "b_entrantes", name: { es: "Loaded Bacon Cheese Fries", en: "Loaded Bacon Cheese Fries", fr: "Frites Chargées Fromage Bacon" }, description: { es: "Montaña de patatas rizadas sepultadas bajo una cascada de queso cheddar derretido y trozos de bacon ultra crujiente.", en: "Mountain of curly fries buried under a cascade of melted cheddar cheese and ultra-crispy bacon bits.", fr: "Montagne de frites bouclées ensevelies sous une cascade de cheddar fondu et éclats de bacon ultra-croustillants." }, price: 8.5, allergens: ["LE", "SO"], isChefRecommendation: true, image: "/images/demo/burger/b01_entrantes_fries.jpeg" },
  { id: "b2", category: "b_entrantes", name: { es: "Spicy Buffalo Wings", en: "Spicy Buffalo Wings", fr: "Ailes Buffalo Épicées" }, description: { es: "Alitas de pollo carnudas y fritas, pringadas en nuestra salsa buffalo roja ardiente. Servidas con salsa ranch.", en: "Meaty fried chicken wings, smothered in our fiery red buffalo sauce. Served with ranch dressing.", fr: "Ailes de poulet charnues et frites, badigeonnées de notre sauce buffalo rouge ardente. Servies avec sauce ranch." }, price: 9.0, allergens: ["LE", "SO", "HU"], image: "/images/demo/burger/b02_entrantes_wings.jpeg" },
  { id: "b3", category: "b_entrantes", name: { es: "Tequeños Venezolanos Fundentes", en: "Melting Venezuelan Tequeños", fr: "Tequeños Vénézuéliens Fondants" }, description: { es: "Cinco deditos de masa hojaldrada frita que esconden un núcleo expansivo de queso blanco que se estira al morder.", en: "Five fried puff pastry sticks hiding an expansive core of white cheese that stretches when bitten.", fr: "Cinq bâtonnets de pâte feuilletée frite cachant un cœur expansif de fromage blanc qui s'étire sous la dent." }, price: 7.5, allergens: ["GL", "LE"], image: "/images/demo/burger/b03_entrantes_tequenos.jpeg" },
  { id: "b4", category: "b_entrantes", name: { es: "Nachos Volcán Pulled Pork", en: "Volcano Pulled Pork Nachos", fr: "Nachos Volcan Porc Effiloché" }, description: { es: "Totopos crujientes de maíz amarillo repletos de cerdo deshilachado dulce, jalapeños ardientes y crema agria fresca.", en: "Crispy yellow corn tortilla chips packed with sweet pulled pork, fiery jalapeños, and fresh sour cream.", fr: "Chips de maïs jaune croustillantes garnies de porc effiloché doux, jalapeños ardents et crème aigre fraîche." }, price: 12.0, allergens: ["LE", "SU"], image: "/images/demo/burger/b04_entrantes_nachos.jpeg" },
  
  { id: "b5", category: "b_smash_clasicas", name: { es: "Classic Single Smash", en: "Classic Single Smash", fr: "Smash Classique Simple" }, description: { es: "Un disco de vaca rubia gallega aplastado hasta lograr costra perfecta, queso americano, pepinillos y mostaza en pan brioche.", en: "A patty of Galician blonde cow smashed to a perfect crust, American cheese, pickles, and mustard on a brioche bun.", fr: "Un palet de vache blonde de Galice écrasé pour une croûte parfaite, fromage américain, cornichons et moutarde dans un pain brioché." }, price: 9.5, allergens: ["GL", "LE", "SU", "SE"], image: "/images/demo/burger/b05_smash_single.jpeg" },
  { id: "b6", category: "b_smash_clasicas", name: { es: "Bacon Double Smash", en: "Bacon Double Smash", fr: "Double Smash Bacon" }, description: { es: "El estándar de oro. Dos carnes smash crujientes, doble capa de queso americano fundido y tiras gruesas de bacon ahumado.", en: "The gold standard. Two crispy smash patties, double layer of melted American cheese, and thick smoked bacon strips.", fr: "La norme d'or. Deux viandes smash croustillantes, double couche de fromage américain fondu et épaisses lanières de bacon fumé." }, price: 13.5, allergens: ["GL", "LE", "SE"], isChefRecommendation: true, image: "/images/demo/burger/b06_smash_double.jpeg" },
  { id: "b7", category: "b_smash_clasicas", name: { es: "Oklahoma Fried Onion", en: "Oklahoma Fried Onion", fr: "Oignon Frit Oklahoma" }, description: { es: "Carne prensada directamente sobre una cama de cebolla cortada en mandolina, caramelizándose junta en la plancha.", en: "Meat pressed directly over a bed of mandolin-sliced onion, caramelizing together on the griddle.", fr: "Viande pressée directamente sur un lit d'oignon émincé à la mandoline, caramélisant ensemble sur la plancha." }, price: 11.5, allergens: ["GL", "LE", "SE"], image: "/images/demo/burger/b07_smash_oklahoma.jpeg" },
  { id: "b8", category: "b_smash_clasicas", name: { es: "Crispy Chicken Sandwich", en: "Crispy Chicken Sandwich", fr: "Sandwich Poulet Croustillant" }, description: { es: "Muslo de pollo deshuesado, marinado en buttermilk y frito estilo sureño, con ensalada coleslaw refrescante.", en: "Boneless chicken thigh, marinated in buttermilk and Southern fried, with refreshing coleslaw.", fr: "Cuisse de poulet désossée, marinée au babeurre et frite façon sud, avec salade de chou rafraîchissante." }, price: 12.0, allergens: ["GL", "LE", "HU", "SO"], image: "/images/demo/burger/b08_smash_chicken.jpeg" },
  
  { id: "b9", category: "b_smash_premium", name: { es: "Triple Truffle Smash Beast", en: "Triple Truffle Smash Beast", fr: "Bête Triple Smash Truffe" }, description: { es: "Monstruosidad de tres carnes, triple queso havarti, cebolla caramelizada oscura y una potente mayonesa de trufa negra.", en: "Monstrosity of three patties, triple havarti cheese, dark caramelized onion, and a potent black truffle mayo.", fr: "Monstruosité de trois viandes, triple fromage havarti, oignon caramélisé foncé et une puissante mayo à la truffe noire." }, price: 16.5, allergens: ["GL", "LE", "HU", "SE"], isChefRecommendation: true, image: "/images/demo/burger/b09_smash_truffle.jpeg" },
  { id: "b10", category: "b_smash_premium", name: { es: "La Ingobernable Provolone", en: "The Ungovernable Provolone", fr: "L'Ingouvernable Provolone" }, description: { es: "No podrás morderla fácil. Lleva un disco entero de queso provolone rebozado y frito chorreando por los bordes.", en: "You won't bite it easily. It features a whole breaded and fried provolone disc dripping down the edges.", fr: "Vous ne pourrez pas la mordre facilement. Elle contient un disque entier de provolone pané et frit dégoulinant sur les bords." }, price: 17.0, allergens: ["GL", "LE", "HU", "SE"], image: "/images/demo/burger/b10_smash_provolone.jpeg" },
  { id: "b11", category: "b_smash_premium", name: { es: "Veggie Beyond Smash", en: "Veggie Beyond Smash", fr: "Veggie Beyond Smash" }, description: { es: "Nuestra técnica smash aplicada a la increíble proteína vegetal Beyond Meat, con queso vegano y pan libre de crueldad.", en: "Our smash technique applied to the incredible Beyond Meat plant protein, with vegan cheese and cruelty-free bun.", fr: "Notre technique smash appliquée à l'incroyable protéine végétale Beyond Meat, avec fromage vegan et pain sans cruauté." }, price: 14.5, allergens: ["GL", "SO"], image: "/images/demo/burger/b11_smash_veggie.jpeg" },
  { id: "b12", category: "b_smash_premium", name: { es: "Mac & Cheese Fat Burger", en: "Mac & Cheese Fat Burger", fr: "Fat Burger Mac & Cheese" }, description: { es: "Una atrocidad deliciosa. Sustituimos la lechuga por una pala de macarrones con queso cheddar radiactivo.", en: "A delicious atrocity. We substitute lettuce for a scoop of mac and cheese with radioactive cheddar.", fr: "Une atrocité délicieuse. Nous remplaçons la laitue par une louche de macaronis au fromage avec du cheddar radioactif." }, price: 15.5, allergens: ["GL", "LE", "HU", "SE"], image: "/images/demo/burger/b12_smash_maccheese.jpeg" },
  
  { id: "b13", category: "b_pizzas", name: { es: "Margherita di Bufala Artesana", en: "Artisan Bufala Margherita", fr: "Margherita di Bufala Artisanale" }, description: { es: "Masa madre fermentada 72h, base de tomate San Marzano brillante, auténtica mozzarella di bufala y albahaca dulce fresca.", en: "72h fermented sourdough, bright San Marzano tomato base, authentic bufala mozzarella, and fresh sweet basil.", fr: "Pâte au levain fermentée 72h, base tomate San Marzano brillante, authentique mozzarella di bufala et basilic doux frais." }, price: 13.0, allergens: ["GL", "LE"], image: "/images/demo/burger/b13_pizza_bufala.jpeg" },
  { id: "b14", category: "b_pizzas", name: { es: "Detroit Spicy Pepperoni", en: "Detroit Spicy Pepperoni", fr: "Pepperoni Épicé Detroit" }, description: { es: "Estilo Detroit: cuadrada, gruesa y con costra de queso en los bordes. Inundada de pepperoni picante que hace 'cuencos' de aceite.", en: "Detroit style: square, thick, with cheese crust edges. Flooded with spicy pepperoni that cups the oil.", fr: "Style Detroit: carrée, épaisse, bords croûtés de fromage. Inondée de pepperoni épicé qui forme des coupes d'huile." }, price: 17.5, allergens: ["GL", "LE", "SO"], isChefRecommendation: true, image: "/images/demo/burger/b14_pizza_detroit.jpeg" },
  { id: "b15", category: "b_pizzas", name: { es: "Pizza Bianca Trufada", en: "Truffle Bianca Pizza", fr: "Pizza Bianca Truffée" }, description: { es: "Sin tomate. Base de crema fraîche y ricotta, salteado de setas silvestres y perlas de trufa negra aromática.", en: "No tomato. Crème fraîche and ricotta base, sautéed wild mushrooms, and aromatic black truffle pearls.", fr: "Sans tomate. Base crème fraîche and ricotta, poêlée de champignons sauvages et perles de truffe noire aromatique." }, price: 16.0, allergens: ["GL", "LE"], image: "/images/demo/burger/b15_pizza_trufa.jpeg" },
  { id: "b16", category: "b_pizzas", name: { es: "Barbacoa Pulled Pork Sweet", en: "Sweet BBQ Pulled Pork Pizza", fr: "Pizza BBQ Porc Effiloché Doux" }, description: { es: "Salsa barbacoa ahumada, queso gouda derretido, cerdo deshilachado súper meloso y aros de cebolla roja.", en: "Smoky BBQ sauce, melted gouda cheese, super sticky pulled pork, and red onion rings.", fr: "Sauce BBQ fumée, gouda fondu, porc effiloché super collant et rondelles d'oignon rouge." }, price: 15.5, allergens: ["GL", "LE", "SU", "SO"], image: "/images/demo/burger/b16_pizza_bbq.jpeg" },
  
  { id: "b17", category: "b_complementos", name: { es: "Tarrina Salsa Secreta Crave", en: "Crave Secret Sauce Tub", fr: "Pot Sauce Secrète Crave" }, description: { es: "Nuestra fórmula inconfundible. Mayonesa, kétchup, especias y relish de pepinillo dulce finamente picado.", en: "Our unmistakable formula. Mayo, ketchup, spices, and finely chopped sweet pickle relish.", fr: "Notre formule incomparable. Mayo, ketchup, épices et relish de cornichon doux finement haché." }, price: 1.5, allergens: ["HU", "SU"], image: "/images/demo/burger/b17_salsa_crave.jpeg" },
  { id: "b18", category: "b_complementos", name: { es: "Extra Mayo Trufada Oscura", en: "Dark Truffle Mayo Extra", fr: "Extra Mayo Truffée Foncée" }, description: { es: "Emulsión densa de mayonesa artesanal inyectada con pura pasta de trufa negra y aceite de oliva.", en: "Dense emulsion of artisan mayo injected with pure black truffle paste and olive oil.", fr: "Émulsion dense de mayo artisanale injectée de pure pâte de truffe noire et huile d'olive." }, price: 2.0, allergens: ["HU"], image: "/images/demo/burger/b18_salsa_trufa.jpeg" },
  { id: "b19", category: "b_complementos", name: { es: "Bañera de Cheddar Líquido", en: "Liquid Cheddar Bathtub", fr: "Baignoire Cheddar Liquide" }, description: { es: "Un recipiente enorme de salsa cheddar americana caliente para que ahogues tus hamburguesas o patatas.", en: "A huge container of hot American cheddar sauce to drown your burgers or fries.", fr: "Un énorme récipient de sauce cheddar américaine chaude pour noyer vos burgers ou frites." }, price: 2.5, allergens: ["LE"], image: "/images/demo/burger/b19_salsa_cheddar.jpeg" },
  { id: "b20", category: "b_complementos", name: { es: "Sirope Miel Extra Picante", en: "Extra Spicy Honey Syrup", fr: "Sirop Miel Extra Épicé" }, description: { es: "Miel natural de flores infusionada en frío durante semanas con chiles habaneros. Para valientes.", en: "Natural flower honey cold-infused for weeks with habanero chilies. For the brave.", fr: "Miel naturel de fleurs infusé à froid pendant des semaines avec piments habaneros. Pour les courageux." }, price: 2.0, allergens: [], image: "/images/demo/burger/b20_salsa_miel.jpeg" },
  { id: "b21", category: "b_postres", name: { es: "Mega Shake Oreo Monster", en: "Mega Monster Oreo Shake", fr: "Mega Shake Monstre Oreo" }, description: { es: "Medio litro de denso helado de vainilla batido con trozos gigantes de galleta Oreo y coronado con nata montada.", en: "Half a liter of dense vanilla ice cream blended with giant Oreo cookie chunks and topped with whipped cream.", fr: "Un demi-litre de dense glace vanille mixée avec de gros morceaux de biscuit Oreo y surmontée de chantilly." }, price: 6.5, allergens: ["GL", "LE", "SO"], isChefRecommendation: true, image: "/images/demo/burger/b21_postre_shake.jpeg" },
  { id: "b22", category: "b_postres", name: { es: "Tarta de Queso Biscoff Lotus", en: "Biscoff Lotus Cheesecake", fr: "Cheesecake Biscoff Lotus" }, description: { es: "Base de galleta triturada, crema densa de queso y una capa gruesa e innegociable de crema Lotus fundida.", en: "Crushed cookie base, dense cream cheese, and a thick, non-negotiable layer of melted Lotus cream.", fr: "Base de biscuit écrasé, crème dense de fromage et une couche épaisse et non négociable de crème Lotus fondue." }, price: 7.0, allergens: ["GL", "LE", "SO"], image: "/images/demo/burger/b22_postre_biscoff.jpeg" },
  { id: "b23", category: "b_postres", name: { es: "Brownie Volcánico Oscuro", en: "Dark Volcanic Brownie", fr: "Brownie Volcanique Foncé" }, description: { es: "Cuadrado de brownie de chocolate belga 70% servido hirviendo en sartén de hierro fundido con centro líquido.", en: "70% Belgian chocolate brownie square served boiling in a cast iron skillet with liquid center.", fr: "Carré de brownie chocolat belge 70% servi bouillant dans une poêle en fonte avec centre liquide." }, price: 6.0, allergens: ["GL", "LE", "HU", "SO"], image: "/images/demo/burger/b23_postre_brownie.jpeg" },
  { id: "b24", category: "b_postres", name: { es: "Helado Soft Cremoso", en: "Creamy Soft Serve", fr: "Glace Italienne Crémeuse" }, description: { es: "Copa clásica de helado estilo máquina americana, textura densa y sabor a vainilla de Madagascar o chocolate intenso.", en: "Classic cup of American machine style ice cream, dense texture and Madagascar vanilla or intense chocolate flavor.", fr: "Coupe classique de glace style machine américaine, texture dense et saveur vanille de Madagascar ou chocolat intense." }, price: 4.5, allergens: ["LE"], image: "/images/demo/burger/b24_postre_helado.jpeg" },
  
  { id: "b25", category: "b_bebidas", name: { es: "Limonada Rosa Artesana", en: "Artisan Pink Lemonade", fr: "Limonade Rose Artisanale" }, description: { es: "Zumo de limones recién exprimidos mezclado con un puré dulce y ácido de frambuesas frescas silvestres.", en: "Freshly squeezed lemon juice mixed with a sweet and tart puree of fresh wild raspberries.", fr: "Jus de citrons fraîchement pressés mélangé à une purée douce et acide de framboises fraîches sauvages." }, price: 4.0, allergens: [], image: "/images/demo/burger/b25_bebida_limonada.jpeg" },
  { id: "b26", category: "b_bebidas", name: { es: "Coca-Cola Zero Lata", en: "Coca-Cola Zero Can", fr: "Canette Coca-Cola Zéro" }, description: { es: "Lata clásica de 33cl servida congelada. El acompañamiento innegociable para cualquier burger smash.", en: "Classic 33cl can served frozen. The non-negotiable accompaniment for any smash burger.", fr: "Canette classique 33cl servie glacée. L'accompagnement non négociable pour tout smash burger." }, price: 2.5, allergens: [], image: "/images/demo/burger/b26_bebida_cola.jpeg" },
  { id: "b27", category: "b_bebidas", name: { es: "Dr Pepper de Importación", en: "Imported Dr Pepper", fr: "Dr Pepper Importé" }, description: { es: "El icónico refresco americano de cereza y especias importado directamente. Difícil de encontrar.", en: "The iconic American cherry and spice soda imported directly. Hard to find.", fr: "L'emblématique soda américain cerise et épices importé directamente. Difficile à trouver." }, price: 3.5, allergens: [], isChefRecommendation: true, image: "/images/demo/burger/b27_bebida_drpepper.jpeg" },
  { id: "b28", category: "b_bebidas", name: { es: "Agua con Gas Perrier", en: "Perrier Sparkling Water", fr: "Eau Gazeuse Perrier" }, description: { es: "Botella verde mítica. Burbuja gruesa y contundente perfecta para limpiar el paladar entre bocados grasos.", en: "Mythical green bottle. Thick and punchy bubble perfect for cleansing the palate between fatty bites.", fr: "Bouteille verte mythique. Bulle épaisse et percutante parfaite pour nettoyer le palais entre les bouchées grasses." }, price: 2.5, allergens: [], image: "/images/demo/burger/b28_bebida_perrier.jpeg" },
];

export const ALLERGEN_ICONS: Record<string, string> = {
  "PE": "Pescado", "SO": "Soja", "HU": "Huevo", "GL": "Gluten", "SE": "Sésamo",
  "AP": "Apio", "LE": "Lácteos", "CR": "Crustáceos", "MO": "Moluscos", "SU": "Sulfitos", "FR": "Frutos Secos"
};

export const UI_TRANSLATIONS: any = {
  es: {
    menu_title: "Nuestra Carta", table_prefix: "MESA", add_to_order: "Añadir",
    ask_ai: "Asistente IA", chef_rec: "Top Ventas", cart_total: "Total Comanda",
    view_order: "Ver Comanda", empty_cart: "Tu bandeja está vacía.", send_order: "Confirmar y Enviar Pedido",
    chat_prompt: "¿Qué desea añadir a su cuenta hoy?", allergens: "Alérgenos:",
    demo_banner_title: "DEMOSTRACIÓN INTERACTIVA DE SOFTWARE DE SALA", close: "Cerrar",
    order_sent: "Comanda enviada", diner_prefix: "Comensal",
    sales_cta_1: "Ver Otro Diseño", sales_cta_2: "Quiero esta Carta",
    sales_title: "Transforma la Experiencia de tu Sala",
    sales_desc: "Esta es la tecnología que utilizan los líderes del sector para aumentar el ticket medio, dividir cuentas por comensal y fidelizar sin depender de apps de terceros.",
    sales_btn_calendly: "Agendar Auditoría Gratuita", sales_btn_whatsapp: "Hablar con Asesor",
    sales_btn_web: "Ver Más Detalles", select_design: "Seleccionar Tipo de Negocio (Demostración)",
    sushi_promo_tag: "Experiencia Omakase",
    sushi_promo_title: "Únete a The Club y recibe un Sake Premium de cortesía.",
    sushi_promo_btn: "Descubrir Beneficios",
    sushi_loyalty_title: "Membresía Exclusiva",
    sushi_loyalty_desc: "Déjenos su email para acceder a mesas ocultas, eventos de cata privados y reclamar su Sake de bienvenida.",
    email_placeholder: "Su correo electrónico...",
    loyalty_submit: "Solicitar Acceso",
    zoom_dish: "Ampliar Plato",
    tapas_brand: "La Taberna de Baco",
    tapas_subtitle: "Gastrobar, Tapas & Solera Granadina",
    tapas_loyalty_title: "El Club de los Parroquianos",
    tapas_loyalty_desc: "Déjanos tu email y te invitamos a la primera ronda de Alhambra Especial en tu próxima visita.",
    tapas_loyalty_submit: "Apuntarme al Club",
    burger_brand: "BiteCorp",
    burger_promo_tag: "Solo esta semana",
    burger_promo_title: "PATATAS LOADED DE REGALO",
    burger_promo_desc: "Únete al Club Bitecorp y llévate una ración de patatas con bacon y queso con tu primera Smash.",
    burger_loyalty_title: "Únete al Club",
    burger_loyalty_desc: "Déjanos tu correo para llevarte tus patatas y enterarte antes que nadie de los platos fuera de carta.",
    burger_email_placeholder: "TU@CORREO.COM",
    burger_loyalty_submit: "QUIERO ENTRAR",
    cart_title: "Tu Comanda",
    remove: "Eliminar",
    empty_cart_desc: "Selecciona productos de la carta para comenzar tu pedido.",
    total_pay: "Total a Pagar",
    send_to_kitchen: "🚀 Enviar Pedido",
    open_ai: "🤖 Abrir Asistente IA",
    call_waiter: "🛎️ Llamar Camarero",
    ai_assistant_title: "Asistente IA",
    online: "En línea - Mesa",
    continue_ordering: "← Seguir Pidiendo",
    ai_placeholder: "Pregúntale al camarero IA...",
    smart_waiter: "🤵 Camarero Inteligente",
    add_to_order_modal: "➕ Añadir al Pedido",
    back_to_home: "← Volver a DKitchen"
  },
  en: {
    menu_title: "Our Menu", table_prefix: "TABLE", add_to_order: "Add",
    ask_ai: "AI Assistant", chef_rec: "Top Seller", cart_total: "Total Order",
    view_order: "View Order", empty_cart: "Your tray is empty.", send_order: "Confirm and Send Order",
    chat_prompt: "What would you like to add to your tab today?", allergens: "Allergens:",
    demo_banner_title: "INTERACTIVE DINING SOFTWARE DEMO", close: "Close",
    order_sent: "Order sent", diner_prefix: "Diner",
    sales_cta_1: "View Other Design", sales_cta_2: "I Want This Menu",
    sales_title: "Transform Your Dining Experience",
    sales_desc: "This is the technology used by industry leaders to increase average ticket size, split tabs per diner, and build loyalty.",
    sales_btn_calendly: "Schedule Free Audit", sales_btn_whatsapp: "Speak with Advisor",
    sales_btn_web: "View More Details", select_design: "Select Business Type (Demo)",
    sushi_promo_tag: "Omakase Experience",
    sushi_promo_title: "Join The Club and receive a complimentary Premium Sake.",
    sushi_promo_btn: "Discover Benefits",
    sushi_loyalty_title: "Exclusive Membership",
    sushi_loyalty_desc: "Leave us your email to access hidden tables, private tasting events, and claim your welcome Sake.",
    email_placeholder: "Your email address...",
    loyalty_submit: "Request Access",
    zoom_dish: "Enlarge Dish",
    tapas_brand: "Bacchus Tavern",
    tapas_subtitle: "Gastrobar, Tapas & Granadan Tradition",
    tapas_loyalty_title: "The Locals Club",
    tapas_loyalty_desc: "Leave your email and we'll treat you to the first round of Alhambra Especial on your next visit.",
    tapas_loyalty_submit: "Join the Club",
    burger_brand: "BiteCorp",
    burger_promo_tag: "Limited Time",
    burger_promo_title: "FREE LOADED FRIES",
    burger_promo_desc: "Join the Crave Syndicate and get a massive portion of Bacon Fries with your first Smash.",
    burger_loyalty_title: "Join the Syndicate",
    burger_loyalty_desc: "Drop your email to claim your Free Fries and unlock underground secret menu drops.",
    burger_email_placeholder: "YOUR@EMAIL.COM",
    burger_loyalty_submit: "JOIN NOW",
    cart_title: "Your Order",
    remove: "Remove",
    empty_cart_desc: "Select products from the menu to start your order.",
    total_pay: "Total to Pay",
    send_to_kitchen: "🚀 Send Order",
    open_ai: "🤖 Open AI Assistant",
    call_waiter: "🛎️ Call Waiter",
    ai_assistant_title: "AI Assistant",
    online: "Online - Table",
    continue_ordering: "← Continue Ordering",
    ai_placeholder: "Ask the AI waiter...",
    smart_waiter: "🤵 Smart Waiter",
    add_to_order_modal: "➕ Add to Order",
    back_to_home: "← Back to DKitchen"
  },
  fr: {
    menu_title: "Notre Carte", table_prefix: "TABLE", add_to_order: "Ajouter",
    ask_ai: "Assistant IA", chef_rec: "Top Ventes", cart_total: "Total Commande",
    view_order: "Voir Commande", empty_cart: "Votre plateau est vide.", send_order: "Confirmer et Envoyer la Commande",
    chat_prompt: "Que souhaitez-vous ajouter à votre compte aujourd'hui ?", allergens: "Allergènes:",
    demo_banner_title: "DÉMONSTRATION LOGICIEL DE SALLE INTERACTIVE", close: "Fermer",
    order_sent: "Commande envoyée", diner_prefix: "Convive",
    sales_cta_1: "Voir Autre Design", sales_cta_2: "Je Veux Ce Menu",
    sales_title: "Transformez l'Expérience de Votre Salle",
    sales_desc: "C'est la technologie utilisée par les leaders du secteur pour augmenter le ticket moyen, diviser les comptes par convive et fidéliser.",
    sales_btn_calendly: "Planifier un Audit Gratuit", sales_btn_whatsapp: "Parler à un Conseiller",
    sales_btn_web: "Voir Plus de Détails", select_design: "Sélectionner Type d'Affaires (Démo)",
    sushi_promo_tag: "Expérience Omakase",
    sushi_promo_title: "Rejoignez Le Club et recevez un Saké Premium offert.",
    sushi_promo_btn: "Découvrir les Avantages",
    sushi_loyalty_title: "Adhésion Exclusive",
    sushi_loyalty_desc: "Laissez-nous votre email pour accéder aux tables cachées, aux événements de dégustation privés et réclamer votre Saké de bienvenue.",
    email_placeholder: "Votre adresse email...",
    loyalty_submit: "Demander l'Accès",
    zoom_dish: "Agrandir le Plat",
    tapas_brand: "La Taverne de Bacchus",
    tapas_subtitle: "Gastrobar, Tapas & Tradition de Grenade",
    tapas_loyalty_title: "Le Club des Habitués",
    tapas_loyalty_desc: "Laissez votre email et nous vous offrons la première tournée d'Alhambra Especial lors de votre prochaine visite.",
    tapas_loyalty_submit: "Rejoindre le Club",
    burger_brand: "BiteCorp",
    burger_promo_tag: "Durée Limitée",
    burger_promo_title: "FRITES CHARGÉES GRATUITES",
    burger_promo_desc: "Rejoignez le Crave Syndicate et obtenez une portion massive de frites au bacon avec votre premier Smash.",
    burger_loyalty_title: "Rejoindre le Syndicat",
    burger_loyalty_desc: "Laissez votre email pour réclamer vos frites gratuites et débloquer les menus secrets souterrains.",
    burger_email_placeholder: "VOTRE@EMAIL.COM",
    burger_loyalty_submit: "REJOINDRE",
    cart_title: "Votre Commande",
    remove: "Supprimer",
    empty_cart_desc: "Sélectionnez des produits du menu pour commencer votre commande.",
    total_pay: "Total à Payer",
    send_to_kitchen: "🚀 Envoyer la Commande",
    open_ai: "🤖 Ouvrir Assistant IA",
    call_waiter: "🛎️ Appeler le Serveur",
    ai_assistant_title: "Assistant IA",
    online: "En ligne - Table",
    continue_ordering: "← Continuer à Commander",
    ai_placeholder: "Demandez au serveur IA...",
    smart_waiter: "🤵 Serveur Intelligent",
    add_to_order_modal: "➕ Ajouter à la Commande",
    back_to_home: "← Retour à DKitchen"
  }
};
