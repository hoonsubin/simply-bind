import { DocumentItem } from "../types";

type CollectionItemProps = {
  collection: DocumentItem;
};

const CollectionItem: React.FC<CollectionItemProps> = ({
    collection,
}) => {
  return (
    <div>
      {collection.collectionName}
    </div>
  );
};

export default CollectionItem;
