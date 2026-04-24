service folder contains all final points of upload flow. 

relations will be depot -> vehicle -> feature map -> Annotations -> Inspections

you can find actual examples of packages in datasets

will need to parse specified objects and upload to DB and reverse on retrieval

current id are uuids so unique

need to check that featrue maps and annotations packages are unique. so using depot or vehicle id, if feature map fk, check overwrite, if feature map has annotation fk, check overwrite
inspections are as many as you like. 
depot - vehicle one to many, vehicle/depot -> feature map one to one, feature map -> annotations one to one, vehilce depot -> inspections one to many
when creating loading feature map updates vehicle/depot fk, upload annotations update feature map fk, uploads inspections  one to many so vehicle/depot fk in inspection. 

service folder is specific folder to link to db, 
dont think overwrite conditional works currently but when connected to db ill sort download mode out. 
