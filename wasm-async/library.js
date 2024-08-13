mergeInto(LibraryManager.library, {
  read_data: (pathptr) => read_data_impl(pathptr),
});
