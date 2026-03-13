import React from 'react';

interface CategoryPillsProps {
  categories: string[];
  active: string;
  onSelect: (category: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  active,
  onSelect,
}) => (
  <div className="category-strip">
    <div className="category-scroll">
      {categories.map((cat) => (
        <button
          key={cat}
          className={`cat-pill${cat === active ? ' active' : ''}`}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  </div>
);
