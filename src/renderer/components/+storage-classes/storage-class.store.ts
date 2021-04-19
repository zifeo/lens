import { KubeObjectStore } from "../../kube-object.store";
import { autobind } from "../../utils";
import { StorageClass, storageClassApi } from "../../api/endpoints/storage-class.api";
import { apiManager } from "../../api/api-manager";
import { volumesStore } from "../+storage-volumes/volumes.store";
import { addLensKubeObjectMenuItem } from "../../../extensions/registries";
import { Remove, Update } from "@material-ui/icons";
import { editResourceTab } from "../dock/edit-resource.store";

@autobind()
export class StorageClassStore extends KubeObjectStore<StorageClass> {
  api = storageClassApi;

  getPersistentVolumes(storageClass: StorageClass) {
    return volumesStore.getByStorageClass(storageClass);
  }
}

export const storageClassStore = new StorageClassStore();
apiManager.registerStore(storageClassStore);

addLensKubeObjectMenuItem({
  Object: StorageClass,
  Icon: Remove,
  onClick: object => storageClassStore.remove(object),
  text: "Delete",
});

addLensKubeObjectMenuItem({
  Object: StorageClass,
  Icon: Update,
  onClick: editResourceTab,
  text: "Update",
});
