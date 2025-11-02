#!/usr/bin/perl -w

use strict;
use FindBin;
use File::Spec;

# location of the compressed files to unpack
# $FindBin::Bin locates directory of this script; this script will be in <root>/bin
my $basedir = "$FindBin::Bin/..";
# the name of the directory holding the systems
my $sysdir = "Systems";
# the name of the directory containing the $sysdir directory at the destination
my $qualitasdir = "QualitasCorpus";

# check for various arguments
if (@ARGV > 0) {

    # check for usage instructions
    if ($ARGV[0] eq "-h" || $ARGV[0] eq "--help") {
        usage();
        exit(0);
    }

    # check if we are only listing systems, not installing
    if ($ARGV[0] eq "-l") {
        # see if there is a list of systems to list versions of
        if (@ARGV > 1) {
            my $syslist = $ARGV[1];
            my @systems = split(/,/, $syslist);
            print "Available versions:\n";
            foreach my $system (@systems) {
                if (-d "$basedir/$sysdir/$system") {
                    opendir(my $syshandle, "$basedir/$sysdir/$system" ) or die "Error: could not open system directory ($basedir/$sysdir/$system): $!\n";
                    # grab all files that don't start with "."
                    my @versions = grep { /^[^\.]/ } readdir($syshandle);
                    close($syshandle);
                
                    print "\n$system:\n@versions\n";
                } else {
                    print "Warning: \"$system\" does not exist.";
                }
            }
        } 
        # otherwise list all available systems
        else {
            opendir(my $syshandle, "$basedir/$sysdir" ) or die "Error: could not open systems repository ($basedir/$sysdir): $!\n";
            # grab all files that don't start with "."
            my @systems = grep { /^[^\.]/ } readdir($syshandle);
            close($syshandle);
        
            print "Available systems:\n@systems\n";
        }
    
        # when we're listing we don't need to do any installation steps
        exit(0);
    }
}

# process other arguments
my $destination;
my $reduced = 0;
my $subset = 0;
my @systems = ();
my %versions = ();
while (@ARGV > 0) {
    my $option = shift;
    if ($option eq "-r") {
        $reduced = 1;
    } elsif ($option eq "-s") {
        my $syslist = shift;
        # if $syslist == undef (ie. nothing was returned by shift()) the call to split() will return an empty list
        @systems = split(/,/, $syslist);
        if (@systems == 0) {
            die ("Install failed: -s switch encountered but no list of systems was specified\n");
        }
        $subset = 1;
    } elsif ($option eq "-v") {
        my $verlist = shift;
        # if $verlist == undef (ie. nothing was returned by shift()) the call to split will return an empty list
        my @sysvers = split(/,/, $verlist);
        if (@sysvers == 0) {
            die ("Install failed: -v switch encountered but no list of versions was specified\n");
        }
        foreach my $version (@sysvers) {
            my @split = split(/-/, $version);
            $versions{$version} = $split[0];
            if (@split == 1) {
                print "Warning: could not separate system name from version number for \"$version\"\n";
            }
        }
        $subset = 1;
    } elsif ($option eq "-l") {
        # list should not be mixed with other options
        # default behaviour should be abort (?)
        print "Error: -l switch should be the first switch when listing.\n";
        die ("Install failed: installation abort.\n");
    } else {
        # argument is not a recognised switch
        # if this is the last argument, then process it as the destination
        if (@ARGV == 0) {
            $destination = $option;
            if (! -d $destination) {
                if (ask("The destination directory \"$destination\" doesn't exist. Attempt to create it (y/n)?")) {
                    mkdir($destination) or die ("Install failed: could not create directory \"$destination\": $!\n");
                } else {
                    die("Install failed: user cancelled.\n");
                }
            }
        }
        # othewise just throw an error
        else {
            print "Warning: unexpected switch \"$option\"\n";
        }
    }
}

# if no destination directory was provided, we'll install in place
if (!defined $destination) {
    #die("Install failed: no destination directory provided.\n");
    $destination = "$basedir/..";
}

# check if we are installing in place by comparing absolute paths
my $inplace = 0;
if (File::Spec->rel2abs($destination) eq File::Spec->rel2abs("$basedir/..")) {
    if (ask("The corpus will unpack all files in place. Are you sure you want to continue? (y/n)?")) {
        $inplace = 1;
        
        ### HACK for setting paths correctly
        $destination = $basedir;
        $qualitasdir = ".";
        
    } else {
        die ("Install failed: user cancel.\n");
    }
}

# if there is no specified list of systems to install, read list of all directories from the systems repository
if (!$subset) {
    opendir(my $syshandle, "$basedir/$sysdir" ) or die "Install failed: could not open systems repository ($basedir/$sysdir): $!\n";
    # grab all files that don't start with "."
    @systems = grep { /^[^\.]/ } readdir($syshandle);
    close($syshandle);
}

# keep track of whether errors occurred
my $success = 1;

# we only need to copy if we're not installing in place
if (!$inplace) {

    # check if installation already exists in destination directory
    my $installexists = -d "$destination/$qualitasdir";
    if ($installexists) {
        if (!ask("The destination directory \"$destination\" already contains an existing installation. Are you sure you want to install into the same directory (y/n)?")) {
            die ("Install failed: user cancel.\n");
        }
    }

    # copy systems to destination
    print "Copying systems to destination (this may take a few minutes)...\n";
    if (!$installexists) {
        mkdir("$destination/$qualitasdir") or die "Install failed: could not create directory \"$destination/$qualitasdir\": $!\n";
    }

    # if the user has specified systems/versions to install, only copy those
    if ($subset) {
        # create $sysdir first
        if (! -d "$destination/$qualitasdir/$sysdir") {
            mkdir("$destination/$qualitasdir/$sysdir") or die "Install failed: could not create directory \"$destination/$qualitasdir/$sysdir\": $!\n";
        }
        
        # copy individual systems
        if (@systems > 0) {
            for(my $i = $#systems; $i >= 0; $i--) {
                if (!-e "$basedir/$sysdir/$systems[$i]") {
                    print "Warning: could not find \"$systems[$i]\". Skipping.\n";
                    delete $systems[$i];
                    next;
                }
                if (system("cp -rfp $basedir/$sysdir/$systems[$i] $destination/$qualitasdir/$sysdir") != 0) {
                    print "Warning: could not copy \"$systems[$i]\" to destination directory. Skipping.\n";
                    delete $systems[$i];
                }
            }
        }
        
        # copy individual versions
        if (keys %versions > 0) {
            foreach my $version (keys %versions) {
                my $system = $versions{$version};
                
                if (!-e "$basedir/$sysdir/$system/$version") {
                    print "Warning: could not find \"$system/$version\". Skipping.\n";
                    delete $versions{$version};
                    next;
                }
                
                # make the directory for the system if it doesn't exist
                if (! -d "$destination/$qualitasdir/$sysdir/$system") {
                    mkdir("$destination/$qualitasdir/$sysdir/$system") or die "Install failed: could not create directory \"$destination/$qualitasdir/$sysdir/$system\": $!\n";
                }
            
                if (system("cp -rfp $basedir/$sysdir/$system/$version $destination/$qualitasdir/$sysdir/$system") != 0) {
                    print "Warning: could not copy \"$system/$version\" to destination directory. Skipping.\n";
                    delete $versions{$version};
                }
            }
        }
    }
    # otherwise we can copy everything in one go
    else {
        system("cp -rfp $basedir/$sysdir $destination/$qualitasdir") == 0 or die "Install failed: could not copy \"$sysdir/\" to destination directory.\n";
    }
    
    # other files are not critical, only display warning
    if (system("cp -rfp $basedir/bin $destination/$qualitasdir") != 0) {
        print "Warning: could not copy \"bin/\" to destination directory.\n";
        $success = 0;
    }
    if (system("cp -rfp $basedir/docs $destination/$qualitasdir") != 0) {
        print "Warning: could not copy \"docs/\" to destination directory.\n";
        $success = 0;
    }
    if (system("cp -fp $basedir/README $destination/$qualitasdir") != 0) {
        print "Warning: could not copy \"README\" to destination directory.\n";
        $success = 0;
    }
}

# if there are no valid systems/versions to install, abort
if (@systems == 0 && keys %versions == 0) {
    die "Install failed: nothing to install.\n";
}

# extract each system
if (@systems > 0) {
    foreach my $system (@systems) {
        print "Installing $system:\n";
        my $ret = install_system("$destination/$qualitasdir/$sysdir/$system", $reduced);
        if ($success == 1) {
	  # If the system that didn't install was jre then want to provide
	  # different report.
	  if ($ret == 0 && $system eq "jre") {
	    $success = -1;
	  } else {
	    $success = $ret;
	  }
	}
    }
}

if (keys %versions > 0) {
    foreach my $version (keys %versions) {
        my $system = $versions{$version};
        print "Installing $version:\n";
        my $ret = install_version("$destination/$qualitasdir/$sysdir/$system/$version", $reduced);
        if ($success == 1) {
            $success = $ret;
        }
    }
}

print "\n";
if ($success > 0) {
    print "Installation successful.\n";
} elsif ($success < 0) {
    print "Installation successful except for jre sysvers.\n";
} else {
    print "Installation finished with errors.\n";
}

exit(0);

# ----- END ----- #

# Ask the user a yes/no question. Reasks the question if the input is invalid.
# Returns 1 if user replies yes ("y"), otherwise 0 ("n")
# Arguments:
#  0: question
sub ask {
    my ($question) = @_;
    while (1) {
        print "$question ";
        my $input = <STDIN>; chomp $input;
        if ($input =~ m/^y$/i) {
            return 1;
        } elsif ($input =~ m/^n$/i) {
            return 0;
        }
    }
}

# Extracts every version of a given system.
# Returns 1 if installation was successful, otherwise 0 if any part was unsuccessful.
# Arguments:
#  0: directory to system
#  1: whether to do a reduced installation
sub install_system {
    my ($sysdir, $reduced) = @_;
    my $syshandle;
    if (!opendir($syshandle, $sysdir)) {
        print "\tWarning: could not open \"$sysdir\"";
        return 0;
    }
    
    # grab all files that don't start with a "."
    my @sysverdirs = grep { /^[^\.]/ } readdir($syshandle);
    close($syshandle);

    # check if there are any versions to install
    if (@sysverdirs == 0) {
        print "\tWarning: nothing to install.\n";
        return 1;
    }
    
    my $success = 1;
    foreach my $sysverdir (@sysverdirs) {
        # make sure we only try to install from directories
        if (-d "$sysdir/$sysverdir") {
            my $ret = install_version("$sysdir/$sysverdir", $reduced);
            if ($success == 1) {
                $success = $ret;
	    }
        }
    }
    
    return $success;
}

# Extracts the specified version of a given system.
# Returns 1 if installation was successful, otherwise 0.
# Arguments:
#  0: directory to version
#  1: whether to do a reduced installation
sub install_version {
    my ($version, $reduced) = @_;
    
    my @split = split(/\//, $version);
    my $name = $split[$#split];
    print "$name...\n";
        
    # check if the .install file exists
    if (-e "$version/.install" )
    {
        my $command = "$version/.install";
        my @args = ("$version");
        if ($reduced) {
            unshift(@args, "-reduced");
        }
        
        if (system($command . " " . join(" ", @args)) != 0) {
            print "FAILED!\n";
            return 0;
        }
        print "\n";
        
        if (system("rm $version/.install") != 0) {
            print "\tWarning: unable to remove \".install\" from $name\n";
        }
        
        return 1;
    } else {
        print "\tWarning: could not find \".install\" in $version\n";
        return 0;
    }
}

# Prints usage instructions.
sub usage {
    print "Install the Qualitas Corpus into the destination folder.\n";
    print "\n";
    print "Usage:\n";
    print "\t./install.pl [-r] [-s system1[,system2,...]]\n";
    print "\t             [-v sysver1[,sysver2,...]] [destination]\n";
    print "\t./install.pl -l [system1[,system2,...]]\n";
    print "\n";
    print "Options:\n";
    print "\t-r\tReduced installation.\n";
    print "\t\tSome files will not be extracted or installed.\n";
    print "\t-s\tInstall only the specified systems.\n";
    print "\t-v\tInstall only the specified versions of a system.\n";
    print "\t-l\tList available versions of the specified systems.\n";
    print "\t\tIf no systems are specified, list all available systems.\n";
    print "\n";
    print "\t\tIf both -s and -v are omitted, all systems are installed.\n";
    print "\n";
    print "\t\tIf no destination is specified, all files will be unpacked\n";
    print "\t\tin place.\n";
    print "\n";
    print "Description:\n";
    print "The installed corpus will have the following stucture:\n";
    print "\n";
    print "(destination)/\n";
    print "\t|- $qualitasdir/\n";
    print "\t\t|- Systems/\n";
    print "\t\t\t|- ...\n";
    print "\t\t|- bin/\n";
    print "\t\t|- docs/\n";
    print "\t\t|- README\n";
    print "\n";
}
