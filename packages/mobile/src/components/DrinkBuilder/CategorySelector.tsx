import React from "react";
import { IonList, IonItem, IonLabel, IonAvatar, IonText, IonNote } from "@ionic/react";
import { DrinkCategory } from "@drink-ux/shared";
import "./CategorySelector.css";

interface CategorySelectorProps {
  onSelect: (category: DrinkCategory) => void;
}

const categories = [
  {
    id: DrinkCategory.COFFEE,
    name: "Coffee",
    description: "Hot & iced coffee drinks",
    image: "https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg",
    color: "#8B4513",
  },
  {
    id: DrinkCategory.TEA,
    name: "Tea",
    description: "Hot & iced teas",
    image:
      "https://media.istockphoto.com/id/466073662/photo/tea-cup-on-saucer-with-tea-being-poured.jpg?b=1&s=612x612&w=0&k=20&c=QaJW4POCXoI44ZMxKVdDnTQbbALRmocq8w37Nl9d-fY=",
    color: "#2E7D32",
  },
  {
    id: DrinkCategory.ITALIAN_SODA,
    name: "Italian Soda",
    description: "Flavored sodas",
    image:
      "https://media.istockphoto.com/id/482100878/photo/row-of-italian-soda-drinks.jpg?b=1&s=612x612&w=0&k=20&c=Swy5YxCLKasC1nwd0tjlcdHf47hLlE_OT_xKXE25cuM=",
    color: "#FF6B35",
  },
  {
    id: DrinkCategory.JUICE,
    name: "Juice",
    description: "Fresh juices",
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&h=300&fit=crop&crop=center",
    color: "#FF9800",
  },
  {
    id: DrinkCategory.BLENDED,
    name: "Blended",
    description: "Smoothies & frappes",
    image: "https://images.pexels.com/photos/214333/pexels-photo-214333.jpeg",
    color: "#E91E63",
  },
  {
    id: DrinkCategory.SPECIALTY,
    name: "Specialty",
    description: "Unique creations",
    image: "https://images.pexels.com/photos/19899299/pexels-photo-19899299.png",
    color: "#9C27B0",
  },
];

const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelect }) => {
  return (
    <div className="category-selector">
      <IonText>
        <h2 className="selector-title">What would you like?</h2>
      </IonText>
      <IonList className="category-list" lines="none">
        {categories.map((category, index) => (
          <IonItem
            key={category.id}
            button
            onClick={() => onSelect(category.id)}
            className="category-item"
            style={
              {
                "--animation-delay": `${index * 0.1}s`,
              } as React.CSSProperties
            }
            aria-label={`Select ${category.name} - ${category.description}`}
          >
            <IonAvatar slot="start" className="category-avatar">
              <img src={category.image} alt={category.name} className="category-image" />
            </IonAvatar>
            <IonLabel>
              <h2>{category.name}</h2>
              <IonNote color="medium">{category.description}</IonNote>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    </div>
  );
};

export default CategorySelector;
