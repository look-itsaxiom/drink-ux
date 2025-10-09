import React from 'react';
import { IonIcon } from '@ionic/react';
import { cafe, leaf, water, iceCream, sparkles, wine } from 'ionicons/icons';
import { DrinkCategory } from '@drink-ux/shared';

interface CategorySelectorProps {
  onSelect: (category: DrinkCategory) => void;
}

const categories = [
  { id: DrinkCategory.COFFEE, name: 'Coffee', icon: cafe, description: 'Hot & iced coffee drinks' },
  { id: DrinkCategory.TEA, name: 'Tea', icon: leaf, description: 'Hot & iced teas' },
  { id: DrinkCategory.ITALIAN_SODA, name: 'Italian Soda', icon: water, description: 'Flavored sodas' },
  { id: DrinkCategory.JUICE, name: 'Juice', icon: wine, description: 'Fresh juices' },
  { id: DrinkCategory.BLENDED, name: 'Blended', icon: iceCream, description: 'Smoothies & frappes' },
  { id: DrinkCategory.SPECIALTY, name: 'Specialty', icon: sparkles, description: 'Unique creations' },
];

const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelect }) => {
  return (
    <div className="category-selector">
      <h2 className="selector-title">What would you like?</h2>
      <div className="category-grid">
        {categories.map((category) => (
          <div
            key={category.id}
            className="category-card"
            onClick={() => onSelect(category.id)}
          >
            <IonIcon icon={category.icon} className="category-icon" />
            <h3>{category.name}</h3>
            <p>{category.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategorySelector;
