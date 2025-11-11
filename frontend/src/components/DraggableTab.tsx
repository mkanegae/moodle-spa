import React, { useRef } from 'react';
import { useDrag, useDrop, DropTargetMonitor } from 'react-dnd';
import { Tab } from '@mui/material';

interface DraggableTabProps {
  id: string;
  index: number;
  label: string;
  moveTab: (dragIndex: number, hoverIndex: number) => void;
  selected?: boolean;
  onClick?: () => void;
}

const ItemType = 'TAB';

interface DragItem {
  index: number;
  id: string;
  type: string;
}

interface CollectedProps {
  handlerId: string | symbol | null;
}

const DraggableTab: React.FC<DraggableTabProps> = ({
  id,
  index,
  label,
  moveTab,
  selected,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<DragItem, void, CollectedProps>({
    accept: ItemType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor: DropTargetMonitor<DragItem, void>) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get horizontal middle
      const hoverMiddleX =
        (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the left
      const hoverClientX = clientOffset!.x - hoverBoundingRect.left;

      // Only perform the move when the mouse has crossed half of the items width
      // When dragging left, only move when the cursor is below 50%
      // When dragging right, only move when the cursor is above 50%

      // Dragging left
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
        return;
      }

      // Dragging right
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
        return;
      }

      // Time to actually perform the action
      moveTab(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: () => {
      return { id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.4 : 1;

  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{ opacity, cursor: 'move', display: 'inline-block' }}
      data-handler-id={handlerId}
    >
      <Tab
        label={label}
        onClick={onClick}
        sx={{
          color: selected ? '#C62828' : '#666',
          fontWeight: selected ? 'bold' : 'medium',
          '&.Mui-selected': {
            color: '#C62828',
            fontWeight: 'bold',
          },
        }}
      />
    </div>
  );
};

export default DraggableTab;
