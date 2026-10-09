export type AppPaths = {
  data_dir: string;
  database_path: string;
  backups_dir: string;
  uploads_dir: string;
  logs_dir: string;
};

export type AppInfo = {
  product_name: string;
  version: string;
  database_ready: boolean;
};
