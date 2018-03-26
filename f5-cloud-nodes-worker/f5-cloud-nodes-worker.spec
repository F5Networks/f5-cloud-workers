Summary: F5 cloud nodes worker
Name: f5-cloud-nodes-worker
Version: 2.0.0
Release: 1
BuildArch: noarch
Group: Development/Libraries
License: Commercial
Packager: F5 Networks <support@f5.com>

%description
REST worker for discovering nodes in a cloud environment

%define BUILD_DIR %{_builddir}/%{name}-%{version}
%define IAPP_DIR /var/config/rest/iapps/%{name}

%prep
mkdir -p %{BUILD_DIR}
cp -r -L %{main}/src/* %{BUILD_DIR}
if [[ -d %{main}/node_modules ]]; then
    cp -r -L %{main}/node_modules %{BUILD_DIR}
fi

# update IAPP_NAME and VERSION in f5-iappslx-lib
for fn in $(find %{BUILD_DIR}/nodejs -name \*.json -o -name \*.js)
do
    sed -i "s/<VERSION>//g" $fn
    sed -i "s/<IAPP_NAME>/%{name}/g" $fn
done

%install

# main
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT%{IAPP_DIR}
cp -r %{BUILD_DIR}/* $RPM_BUILD_ROOT%{IAPP_DIR}

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
%{IAPP_DIR}
