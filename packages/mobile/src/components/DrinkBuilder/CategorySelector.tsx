import React from "react";
import {
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonText,
  IonNote,
  IonSpinner,
  IonIcon,
} from "@ionic/react";
import {
  cafeOutline,
  leafOutline,
  wineOutline,
  colorFillOutline,
  snowOutline,
  sparklesOutline,
  alertCircleOutline,
  restaurantOutline,
  pizzaOutline,
  nutritionOutline,
  iceCreamOutline,
  beerOutline,
} from "ionicons/icons";
import { useCatalogContext } from "../../context/CatalogContext";
import { DerivedCategory } from "../../services/catalogService";
import "./CategorySelector.css";

interface CategorySelectorProps {
  onSelect: (categoryName: string, categoryId: string) => void;
}

/**
 * Get icon for a category name.
 * Matches common names; falls back to a generic restaurant icon.
 */
function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase().replace(/[^a-z]/g, '');
  if (lower.includes('coffee') || lower.includes('espresso')) return cafeOutline;
  if (lower.includes('tea') || lower.includes('chai')) return leafOutline;
  if (lower.includes('soda') || lower.includes('italian')) return wineOutline;
  if (lower.includes('juice') || lower.includes('smoothie')) return colorFillOutline;
  if (lower.includes('blended') || lower.includes('frappe')) return snowOutline;
  if (lower.includes('pizza')) return pizzaOutline;
  if (lower.includes('dessert') || lower.includes('pastry') || lower.includes('bakery') || lower.includes('cake')) return iceCreamOutline;
  if (lower.includes('beer') || lower.includes('wine') || lower.includes('alcohol')) return beerOutline;
  if (lower.includes('fruit') || lower.includes('bowl')) return nutritionOutline;
  if (lower.includes('specialty') || lower.includes('seasonal')) return sparklesOutline;
  return restaurantOutline;
}

/**
 * Get a color for a category based on its name.
 * Generates a consistent hue from the name.
 */
function getCategoryColor(name: string): string {
  const lower = name.toLowerCase();
  // Well-known categories get curated colors
  if (lower.includes('coffee') || lower.includes('espresso')) return '#8B4513';
  if (lower.includes('tea')) return '#2E7D32';
  if (lower.includes('juice')) return '#FF9800';
  if (lower.includes('blended') || lower.includes('smoothie')) return '#E91E63';
  if (lower.includes('soda')) return '#FF6B35';
  if (lower.includes('pizza')) return '#D32F2F';
  if (lower.includes('bakery') || lower.includes('pastry')) return '#795548';
  // Generate hue from name hash for unknown categories
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

/**
 * Transform derived category to display format
 */
function transformCategory(derivedCategory: DerivedCategory) {
  return {
    id: derivedCategory.id,
    name: derivedCategory.name,
    description: `${derivedCategory.items.length} item${derivedCategory.items.length !== 1 ? 's' : ''} available`,
    color: getCategoryColor(derivedCategory.name),
    icon: getCategoryIcon(derivedCategory.name),
    itemCount: derivedCategory.items.length,
  };
}

// Fallback categories when API is not available
const fallbackCategories = [
  { id: "coffee", name: "Coffee", description: "Hot & iced coffee", color: "#8B4513", icon: cafeOutline, itemCount: 0 },
  { id: "tea", name: "Tea", description: "Hot & iced teas", color: "#2E7D32", icon: leafOutline, itemCount: 0 },
  { id: "specialty", name: "Specialty", description: "Unique creations", color: "#9C27B0", icon: sparklesOutline, itemCount: 0 },
];

const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelect }) => {
  let catalogData: { categories: DerivedCategory[]; loading: boolean; error: string | null } = {
    categories: [],
    loading: false,
    error: null,
  };

  try {
    catalogData = useCatalogContext();
  } catch {
    // Context not available, use fallback categories
  }

  const { categories: apiCategories, loading, error } = catalogData;

  if (loading) {
    return (
      <div className="category-selector section">
        <IonText>
          <h2 className="section-title">What would you like?</h2>
        </IonText>
        <div className="loading-container">
          <IonSpinner name="crescent" />
          <p>Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-selector section">
        <IonText>
          <h2 className="section-title">What would you like?</h2>
        </IonText>
        <div className="error-container">
          <IonIcon icon={alertCircleOutline} color="danger" />
          <p>Failed to load menu. Using default categories.</p>
        </div>
        <CategoryList
          categories={fallbackCategories}
          onSelect={onSelect}
        />
      </div>
    );
  }

  const displayCategories = apiCategories.length > 0
    ? apiCategories.map(transformCategory)
    : fallbackCategories;

  return (
    <div className="category-selector section">
      <IonText>
        <h2 className="section-title">What would you like?</h2>
      </IonText>
      <CategoryList categories={displayCategories} onSelect={onSelect} />
    </div>
  );
};

/**
 * Category list component
 */
interface CategoryListProps {
  categories: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
    icon: string;
    itemCount: number;
  }>;
  onSelect: (categoryName: string, categoryId: string) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, onSelect }) => {
  if (categories.length === 0) {
    return (
      <div className="empty-container">
        <p>No categories available</p>
      </div>
    );
  }

  return (
    <IonList className="category-list" lines="none">
      {categories.map((category, index) => (
        <IonItem
          key={category.id}
          button
          onClick={() => onSelect(category.name, category.id)}
          className="category-item interactive-item interactive-item-large slide-in-up"
          style={
            {
              "--animation-delay": `${index * 0.1}s`,
            } as React.CSSProperties
          }
          aria-label={`Select ${category.name} - ${category.description}`}
        >
          <IonAvatar slot="start" className="category-avatar">
            <div
              className="category-icon-circle"
              style={{ backgroundColor: category.color }}
            >
              <IonIcon icon={category.icon} style={{ color: 'white', fontSize: '24px' }} />
            </div>
          </IonAvatar>
          <IonLabel>
            <h2>{category.name}</h2>
            <IonNote color="medium">{category.description}</IonNote>
          </IonLabel>
          {category.itemCount > 0 && (
            <IonNote slot="end" color="medium">
              {category.itemCount} items
            </IonNote>
          )}
        </IonItem>
      ))}
    </IonList>
  );
};

export default CategorySelector;
