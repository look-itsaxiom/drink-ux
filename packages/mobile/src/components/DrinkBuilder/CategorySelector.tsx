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
import { cafeOutline, leafOutline, wineOutline, colorFillOutline, snowOutline, sparklesOutline, alertCircleOutline } from "ionicons/icons";
import { DrinkCategory } from "@drink-ux/shared";
import { useCatalogContext } from "../../context/CatalogContext";
import { CategoryWithItems } from "../../services/catalogService";
import "./CategorySelector.css";

interface CategorySelectorProps {
  onSelect: (category: DrinkCategory, categoryId: string) => void;
}

// Default category metadata for styling (used when API data is available)
const categoryMetadata: Record<string, { color: string; icon: string; description: string; image: string }> = {
  coffee: {
    color: "#8B4513",
    icon: "cafe",
    description: "Hot & iced coffee drinks",
    image: "https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg",
  },
  tea: {
    color: "#2E7D32",
    icon: "leaf",
    description: "Hot & iced teas",
    image: "https://media.istockphoto.com/id/466073662/photo/tea-cup-on-saucer-with-tea-being-poured.jpg?b=1&s=612x612&w=0&k=20&c=QaJW4POCXoI44ZMxKVdDnTQbbALRmocq8w37Nl9d-fY=",
  },
  italian_soda: {
    color: "#FF6B35",
    icon: "wine",
    description: "Flavored sodas",
    image: "https://media.istockphoto.com/id/482100878/photo/row-of-italian-soda-drinks.jpg?b=1&s=612x612&w=0&k=20&c=Swy5YxCLKasC1nwd0tjlcdHf47hLlE_OT_xKXE25cuM=",
  },
  juice: {
    color: "#FF9800",
    icon: "color-fill",
    description: "Fresh juices",
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&h=300&fit=crop&crop=center",
  },
  blended: {
    color: "#E91E63",
    icon: "snow",
    description: "Smoothies & frappes",
    image: "https://images.pexels.com/photos/214333/pexels-photo-214333.jpeg",
  },
  specialty: {
    color: "#9C27B0",
    icon: "sparkles",
    description: "Unique creations",
    image: "https://images.pexels.com/photos/19899299/pexels-photo-19899299.png",
  },
};

// Fallback categories when API is not available
const fallbackCategories = [
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
    image: "https://media.istockphoto.com/id/466073662/photo/tea-cup-on-saucer-with-tea-being-poured.jpg?b=1&s=612x612&w=0&k=20&c=QaJW4POCXoI44ZMxKVdDnTQbbALRmocq8w37Nl9d-fY=",
    color: "#2E7D32",
  },
  {
    id: DrinkCategory.ITALIAN_SODA,
    name: "Italian Soda",
    description: "Flavored sodas",
    image: "https://media.istockphoto.com/id/482100878/photo/row-of-italian-soda-drinks.jpg?b=1&s=612x612&w=0&k=20&c=Swy5YxCLKasC1nwd0tjlcdHf47hLlE_OT_xKXE25cuM=",
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

/**
 * Get icon component based on icon name
 */
function getCategoryIcon(iconName: string | null): string {
  switch (iconName?.toLowerCase()) {
    case "cafe":
    case "coffee":
      return cafeOutline;
    case "leaf":
    case "tea":
      return leafOutline;
    case "wine":
    case "italian_soda":
      return wineOutline;
    case "color-fill":
    case "juice":
      return colorFillOutline;
    case "snow":
    case "blended":
      return snowOutline;
    case "sparkles":
    case "specialty":
      return sparklesOutline;
    default:
      return cafeOutline;
  }
}

/**
 * Map API category to DrinkCategory enum
 */
function mapToDrinkCategory(categoryName: string): DrinkCategory {
  const normalized = categoryName.toLowerCase().replace(/[^a-z]/g, '_');

  switch (normalized) {
    case 'coffee':
      return DrinkCategory.COFFEE;
    case 'tea':
      return DrinkCategory.TEA;
    case 'italian_soda':
    case 'italiansoda':
      return DrinkCategory.ITALIAN_SODA;
    case 'juice':
      return DrinkCategory.JUICE;
    case 'blended':
      return DrinkCategory.BLENDED;
    case 'specialty':
      return DrinkCategory.SPECIALTY;
    default:
      return DrinkCategory.SPECIALTY;
  }
}

/**
 * Transform API category to display format
 */
function transformCategory(apiCategory: CategoryWithItems) {
  const normalizedName = apiCategory.name.toLowerCase().replace(/[^a-z]/g, '_');
  const metadata = categoryMetadata[normalizedName] || {
    color: apiCategory.color || "#6B4423",
    icon: apiCategory.icon || "cafe",
    description: `${apiCategory.items.length} drinks available`,
    image: "https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg",
  };

  return {
    id: apiCategory.id,
    enumCategory: mapToDrinkCategory(apiCategory.name),
    name: apiCategory.name,
    description: metadata.description,
    image: metadata.image,
    color: apiCategory.color || metadata.color,
    icon: apiCategory.icon || metadata.icon,
    itemCount: apiCategory.items.length,
  };
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelect }) => {
  // Try to use catalog context, but handle the case where it's not available
  let catalogData: { categories: CategoryWithItems[]; loading: boolean; error: string | null } = {
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

  // Show loading state
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

  // Show error state
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
        {/* Fall back to hardcoded categories on error */}
        <CategoryList
          categories={fallbackCategories.map(c => ({
            ...c,
            enumCategory: c.id,
            itemCount: 0,
            icon: getCategoryIcon(c.id),
          }))}
          onSelect={(enumCat, _id) => onSelect(enumCat, '')}
        />
      </div>
    );
  }

  // Use API categories if available, otherwise fall back
  const displayCategories = apiCategories.length > 0
    ? apiCategories.map(transformCategory)
    : fallbackCategories.map(c => ({
        ...c,
        enumCategory: c.id,
        itemCount: 0,
        icon: getCategoryIcon(c.id),
      }));

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
    enumCategory: DrinkCategory;
    name: string;
    description: string;
    image: string;
    color: string;
    icon: string;
    itemCount: number;
  }>;
  onSelect: (enumCategory: DrinkCategory, categoryId: string) => void;
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
          onClick={() => onSelect(category.enumCategory, category.id)}
          className="category-item interactive-item interactive-item-large slide-in-up"
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
